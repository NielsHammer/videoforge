"""
VideoForge Transcript Fetcher — Run on Windows (not cloud server)
Fetches transcripts for all 236 reference videos and saves as JSON.

Usage:
  pip install youtube-transcript-api
  python fetch.py

Then upload the output folder to the server:
  scp -r transcripts/ root@YOUR_SERVER_IP:/opt/videoforge/video-library-transcripts/
"""
import json, os, time

from youtube_transcript_api import YouTubeTranscriptApi

VIDEO_IDS = [
    "Cn8HBj8QAbk","7Zi3jL-C8I0","5XyslxsPLQ4","BBb2gC0lByk","4YpzjFb78WQ",
    "QqcGdA6kWD8","BQvGSiCEjgI","Vrtbxvefnjs","edfHZq5lrTA","O5eC5lY7ZXY",
    "aEl-bPEj2X0","7Bi41hjcB_4","fcckVSKQDGk","z3uvnwBMTdY","DgGdlCOCK8s",
    "8VPPQAcac6U","OpcVIomGM50","EKOU3JWDNLI","dsDcQmJHwQc","c9qsHS4GP5M",
    "tj6npHLtw-0","D8RtMHuFsUw","FGDM92QYa60","YXLWyeFVriE","QSTA_aAMoqs",
    "0rvL386DgGA","jjp3WC8Unj8","YSJY3DvnybE","NIk_0AW5hFU","x32Zq-XvID4",
    "DxL2HoqLbyA","zaXKQ70q4KQ","-UrdExQW0cs","nEBFJhAhFHc","zTDFhWWPZ4Q",
    "lczVMeA4gAQ","ha1NneZGm7A","-BnuqQOSKyM","MpcgXTnd_74","_fxCKCcBVQs",
    "MilYefF9DjI","gexpGeSvAxk","rBUjOY12gJA","R7YxLH70pZA","K3pRhJBrcOk",
    "XFpT41748hM","b2_M-1YqnNI","FXF-nD4U5zk","1ozN_0gYTBk","BNfIPVjQwEA",
    "TY9dnrbQano","21VlOjklczE","1-B7sbmB-1w","YG9_MtPOp8w","NgR8fPR3vuQ",
    "fmt5v-9mB5Y","mqFbO8pE7qc","CptjZq0RaZQ","ab8bgVo45_c","LbLLWmmL3YE",
    "uVzCPllwmqw","lFFZhAIrvcc","QHorzBmHl7g","F9DwcURdhgQ","FJFJP6EvsaQ",
    "DDmZBhA-C9M","33mfuVGDrVk","S-6CFpiZLVM","O1sPR-UlYuo","sargwkHeMVU",
    "5gOWnldoNtY","69AIF--tUpk","kv2JjhPVZeU","580O3Z-8ok0","D80KULtCbHw",
    "k_kSCjdf8D0","bq96s64K2YM","m4WOwgUMQuc","6VYtImsCQ44","eJyz7CRWWW0",
    "APSkB4hP73M","tW13N4Hll88","i5OZQQWj5-I","P9iWPk7IW-M","rf_EQvubKlk",
    "ZudTPpJCbbA","0L6Rcgp6j7Y","e-QmGJU1XYc","ZTMregh_428","9JEmsSItdt4",
    "I9unIJnobQU","XBcMiYK7qYY","2G78zkuQSc0","3l6zQTbcgPs","m00WzTsohlA",
    "WEBT1shPyok","W6xjV7lejk8","en-ClrgaV8U","hCSHuvDejGA","OFC8eddNCVs",
    "ZYdCnwI4IkA","xfOT2elC2Ok","5rhHm6WWOIs","2SLSser4y6U","KMbFjoHUYbA",
    "Ay4fmZdZqJE","jw_CWHs2YDU","C6eXTvqdaro","-C_5hzJCHaY","1-izXBhkiHw",
    "XjV4HYZTJB8","lSWDYzC0BvA","Jvkt5UhmxHw","56AD4lejvag","KhFlD54nQrY",
    "YFA8AS5Cu2w","oRMG_HpOAN4","aFoMYz_jWcs","hASHO5ap1Sw","3-MSlNVqzYY",
    "TLPHmHPaCiQ","_OmpRDWRT9U","aQNgelm7JeE","y27B-sKIUHA","fxqcwK5OMag",
    "uVPoq1Svz7g","lRQuyCfSmeI","iyUR6PANjJk","Eq6ATHhBezw","-um9zKf1V30",
    "ROf4oNqGEUc","Od9OG4MGDWA","UM9axnjB4Y4","dVnY0NF4wVo","0Bln-DSbpWU",
    "9XdBltWIe-4","MlD2h0BP0Jc","xSw4eSjR2jY","HkXde9zwWE0","4xnV9l8yHhg",
    "8_1DuqeU8hw","0NCqpRiprnQ","_4HeJO2fkZg","lKxB_q8H1Ks","jQ7Uj6-XKIY",
    "qwckvH38umg","RCnRDiyzcFI","aHeZlyuk33I","hHLhcyK1hgg","LBuzsLC0JDY",
    "6vaBQIlAakc","l0V2de2T-5c","_vFxGhRq4N4","lHrHQZpK1Os","Mt_Koq9PYLg",
    "g0nA8CfxBqA","XCpi8tIWZXE","rgWYo6UkZnU","7HjhZ1aWGlk","OybpaqsnTCU",
    "xAo48QIutrQ","P_Mf6Vx2F54","jz-4UZxQ4qo","QtUcVy5yFJI","QVx66P2H5pU",
    "aNoxGBHw5kY","Fm_aox3XZBo","jxewA0I4_zs","VVTTuUu3JOU","EqXmIyCuyI8",
    "Q05iFvZrW3Q","BU5HWUo53qI","JSMk98LP3zM","SGozRdV7iKk","1D_PISkFKkc",
    "TjdOETbhXBI","C4Fg9rlLYuM","xBepLPnIZ_Y","2eEhGSX0Ois","S744fKzl538",
    "EFkyxzJtiv4","mr7FXvTSYpA","ZOvyn72x6kQ","FVVT8EBqK3g","BHyVg2sXy5w",
    "s8s8Z8fu6L8","Ku9JFyFFIxQ","LJVY7_v_c08","3x6hiS0E_7w","5HgxcEEjQoA",
    "tswqCgoflQk","vSz_VHoIeVc","uq1C6RoQN3U","svmTo99_Vxg","jHWf4FnM9e4",
    "NFcSqAruzwg","7ZR1GTRWEfg","NSSUfLFFVdc","7Eu8to0Q3ls","BRmquQjziZY",
    "XcH1U1BbhRc","Wm6WNFKj7x8","gIhMoJQ3Iso","Nl69mYQPvrE","YsHDYukPTLA",
    "duM71c1CGgU","G6M-y4fsvDU","ph6ncQlk5cU","DloT8tK5XbY","8uGPZC3-x2g",
    "2C9xWRDNdfQ","hd44rXnPLcI","Z2dpK1bDSZA","OsqKBV1vdWs","nE7UjtqXl1w",
    "pEfrdAtAmqk","ky5ZB-mqZKM","hdHjjBS4cs8","Nl7aCUsWykg","U3aXWizDbQ4",
    "8PhdfcX9tG0","_k-F-MMvQV4","-uleG_Vecis","m4-HM_sCvtQ","-2k1rcRzsLA",
    "vqs_0W-MSB0","x7X9w_GIm1s","LmK18kPfMjA","xltW2G60GCs","L5r9kxBrok8",
    "Fgxd4phK8eY","ujWnpB5Wm5E","bhxn_emGHjA","w9G1nz4UlyU","nOieMPrmans",
    "LIF74TSc-dE",
]

OUT_DIR = "transcripts"
os.makedirs(OUT_DIR, exist_ok=True)

api = YouTubeTranscriptApi()
success = 0
failed = 0
skipped = 0

for i, vid in enumerate(VIDEO_IDS):
    out_path = os.path.join(OUT_DIR, f"{vid}.json")
    if os.path.exists(out_path):
        skipped += 1
        continue

    print(f"[{i+1}/{len(VIDEO_IDS)}] {vid}...", end=" ", flush=True)
    try:
        transcript = api.fetch(vid)
        segments = [{"text": s.text, "start": s.start, "duration": s.duration} for s in transcript.snippets]

        # Also save as plain text
        full_text = " ".join(s["text"] for s in segments)

        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({
                "videoId": vid,
                "segments": segments,
                "fullText": full_text,
                "segmentCount": len(segments),
            }, f, ensure_ascii=False, indent=2)

        print(f"OK ({len(segments)} segments)")
        success += 1
        time.sleep(4)
    except Exception as e:
        err_str = str(e)
        if "blocking" in err_str.lower() or "IpBlocked" in type(e).__name__ or "blocked" in err_str.lower():
            print(f"IP BLOCKED — waiting 5 minutes then continuing...")
            time.sleep(300)
            failed += 1
        else:
            print(f"FAILED: {type(e).__name__}")
            with open(out_path, "w") as f:
                json.dump({"videoId": vid, "error": err_str[:200]}, f)
            failed += 1
            time.sleep(6)

print(f"\nDone! Success: {success}, Failed: {failed}, Skipped: {skipped}")
print(f"Transcripts saved to: {os.path.abspath(OUT_DIR)}/")
print(f"\nNext step: upload to server:")
print(f"  scp -r transcripts/ root@YOUR_SERVER_IP:/opt/videoforge/video-library-transcripts/")
