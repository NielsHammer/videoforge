/**
 * Live progress writer — writes the current pipeline-v2 run status to a
 * JSON file served by the existing fileserver, so the user can open a
 * dashboard in a browser and watch the run update in real time.
 *
 * Also writes every log line the pipeline emits to a streaming .log file
 * that the dashboard tails via fetch polling.
 */
import fs from 'fs';
import path from 'path';

const LIVE_DIR = '/opt/videoforge/output/v2-live';
const STATUS_PATH = path.join(LIVE_DIR, 'current.json');
const LOG_PATH = path.join(LIVE_DIR, 'current.log');

if (!fs.existsSync(LIVE_DIR)) fs.mkdirSync(LIVE_DIR, { recursive: true });

let _state = null;

export function initLiveRun({ runId, topic, targetSeconds }) {
  _state = {
    run_id: runId,
    topic,
    target_seconds: targetSeconds,
    started_at: new Date().toISOString(),
    status: 'running',
    current_step: null,
    steps_completed: [],
    step_details: {},
    totals: { input_tokens: 0, output_tokens: 0, cost_usd: 0 },
    watch_url: null,
    error: null,
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(_state, null, 2));
  fs.writeFileSync(LOG_PATH, `[${new Date().toISOString()}] run start: ${runId} — topic: ${topic}\n`);
}

export function updateStep(name, detail = null) {
  if (!_state) return;
  _state.current_step = name;
  _state.updated_at = new Date().toISOString();
  if (detail) _state.step_details[name] = detail;
  fs.writeFileSync(STATUS_PATH, JSON.stringify(_state, null, 2));
  appendLog(`STEP: ${name}${detail ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}

export function completeStep(name, result = null) {
  if (!_state) return;
  if (!_state.steps_completed.includes(name)) _state.steps_completed.push(name);
  if (result) _state.step_details[name] = result;
  _state.updated_at = new Date().toISOString();
  fs.writeFileSync(STATUS_PATH, JSON.stringify(_state, null, 2));
  appendLog(`✓ ${name}${result ? ' → ' + (typeof result === 'string' ? result : JSON.stringify(result).slice(0, 200)) : ''}`);
}

export function updateTotals(totals) {
  if (!_state) return;
  _state.totals = totals;
  fs.writeFileSync(STATUS_PATH, JSON.stringify(_state, null, 2));
}

export function finishLiveRun({ status, watchUrl, error }) {
  if (!_state) return;
  _state.status = status || 'completed';
  _state.finished_at = new Date().toISOString();
  if (watchUrl) _state.watch_url = watchUrl;
  if (error) _state.error = error;
  fs.writeFileSync(STATUS_PATH, JSON.stringify(_state, null, 2));
  appendLog(`[${new Date().toISOString()}] ${_state.status}${watchUrl ? ' — ' + watchUrl : ''}${error ? ' — ' + error : ''}`);
}

export function appendLog(line) {
  try {
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${line}\n`);
  } catch {}
}

export const LIVE_DASHBOARD_URL = 'https://files.tubeautomate.com/watch/v2-live/dashboard.html';
export const LIVE_STATUS_URL = 'https://files.tubeautomate.com/watch/v2-live/current.json';
export const LIVE_LOG_URL = 'https://files.tubeautomate.com/watch/v2-live/current.log';
