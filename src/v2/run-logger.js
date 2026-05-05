/**
 * Run logger — the observability layer for pipeline v2.
 *
 * Every v2 run creates a self-contained directory under /opt/videoforge/runs/
 * with full step-by-step artifacts: inputs, prompts, responses, outputs, token
 * cost, and timing. Structure:
 *
 *   runs/<run-id>/
 *     meta.json           — run metadata, status, totals
 *     steps/NN-<name>/
 *       input.json        — what went into this step
 *       prompt.txt        — full prompt sent to the model (if any)
 *       response.txt      — raw model response (if any)
 *       output.json       — structured output of this step
 *       meta.json         — model, usage, elapsed_ms, cost
 *
 * Runs are safe for concurrent execution (each run has its own directory).
 */
import fs from 'fs';
import path from 'path';

const RUNS_ROOT = '/opt/videoforge/runs';

// Sonnet 4.6 pricing — keep in sync with actual rates
const MODEL_PRICING = {
  'claude-sonnet-4-6': { input: 3, output: 15 }, // $ per million tokens
  'claude-opus-4-6':   { input: 15, output: 75 },
  'claude-opus-4-5':   { input: 15, output: 75 },
  'claude-haiku-4-5':  { input: 1, output: 5 },
};

function computeCost(model, usage) {
  if (!usage) return 0;
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  const inTok = usage.input_tokens ?? 0;
  const outTok = usage.output_tokens ?? 0;
  return (inTok / 1e6) * p.input + (outTok / 1e6) * p.output;
}

function slugify(s) {
  return (s || 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function timestampSlug() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/**
 * Create a new run. Returns a Run object used by all v2 modules.
 * If resumeId is provided, resumes an existing run (useful for retries).
 */
export function createRun({ topic, niche, targetSeconds, resumeId } = {}) {
  if (!fs.existsSync(RUNS_ROOT)) fs.mkdirSync(RUNS_ROOT, { recursive: true });

  const runId = resumeId || `${timestampSlug()}_${slugify(topic)}`;
  const runDir = path.join(RUNS_ROOT, runId);
  const stepsDir = path.join(runDir, 'steps');

  if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });
  if (!fs.existsSync(stepsDir)) fs.mkdirSync(stepsDir, { recursive: true });

  const metaPath = path.join(runDir, 'meta.json');
  let meta;
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } else {
    meta = {
      run_id: runId,
      topic: topic || null,
      niche: niche || null,
      target_seconds: targetSeconds || null,
      started_at: new Date().toISOString(),
      status: 'in_progress',
      steps_completed: [],
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      errors: [],
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  }

  return {
    runId,
    runDir,
    stepsDir,
    meta,

    /** Return the path to a given step directory, creating it on first access. */
    stepDir(index, name) {
      const padded = String(index).padStart(2, '0');
      const dir = path.join(stepsDir, `${padded}-${slugify(name)}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return dir;
    },

    /**
     * Log a completed step. Writes input/prompt/response/output + meta.
     * Updates the run totals. All fields are optional except name+index.
     */
    logStep({ index, name, input, prompt, response, output, model, usage, elapsedMs, error }) {
      const dir = this.stepDir(index, name);

      if (input !== undefined) {
        fs.writeFileSync(path.join(dir, 'input.json'), JSON.stringify(input, null, 2));
      }
      if (prompt !== undefined) {
        fs.writeFileSync(path.join(dir, 'prompt.txt'), String(prompt));
      }
      if (response !== undefined) {
        fs.writeFileSync(path.join(dir, 'response.txt'), String(response));
      }
      if (output !== undefined) {
        fs.writeFileSync(path.join(dir, 'output.json'), JSON.stringify(output, null, 2));
      }

      const cost = computeCost(model, usage);
      const stepMeta = {
        index,
        name,
        model: model || null,
        usage: usage || null,
        cost_usd: cost,
        elapsed_ms: elapsedMs ?? null,
        completed_at: new Date().toISOString(),
        error: error || null,
      };
      fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(stepMeta, null, 2));

      // Update run totals
      if (usage) {
        meta.total_input_tokens += usage.input_tokens || 0;
        meta.total_output_tokens += usage.output_tokens || 0;
        meta.total_cost_usd = Number((meta.total_cost_usd + cost).toFixed(6));
      }
      if (!error && !meta.steps_completed.includes(`${index}-${name}`)) {
        meta.steps_completed.push(`${index}-${name}`);
      }
      if (error) {
        meta.errors.push({ step: `${index}-${name}`, error: String(error), at: new Date().toISOString() });
      }
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

      return { dir, cost };
    },

    /** Mark the run as complete. */
    finish(status = 'completed') {
      meta.status = status;
      meta.finished_at = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    },

    /** Check whether a step has already been completed (for resume support). */
    hasCompleted(index, name) {
      return meta.steps_completed.includes(`${index}-${slugify(name)}`);
    },

    /** Read a previously written step output (for resume support). */
    readStepOutput(index, name) {
      const padded = String(index).padStart(2, '0');
      const dir = path.join(stepsDir, `${padded}-${slugify(name)}`);
      const outPath = path.join(dir, 'output.json');
      if (!fs.existsSync(outPath)) return null;
      return JSON.parse(fs.readFileSync(outPath, 'utf8'));
    },
  };
}
