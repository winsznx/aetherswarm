import os
import shutil
import subprocess
import time

PROJECT_ID = "7794b8b9-9eb0-4398-a370-246f929257f3"

SERVICES = [
    {"name": "Quest Engine", "path": "backend/quest-engine"},
    {"name": "Swarm Coordinator", "path": "backend/swarm-coordinator"},
    {"name": "Scout Agent", "path": "agents/scout"},
    {"name": "Verifier Agent", "path": "agents/verifier"},
    {"name": "Synthesizer Agent", "path": "agents/synthesizer"},
]

DEPLOY_BASE = "/tmp/aetherswarm_deploy"

def deploy_service(service):
    name = service["name"]
    src_path = os.path.abspath(service["path"])
    target_dir = os.path.join(DEPLOY_BASE, name.replace(" ", "_"))
    
    print(f"\n🚀 Preparing {name}...", flush=True)
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    
    shutil.copytree(src_path, target_dir, ignore=shutil.ignore_patterns("node_modules", "target", "venv", ".venv", "__pycache__", ".git", ".DS_Store", "dist", "build"))
    
    # --- FIX FOR NODE SERVICES ---
    # Quest Engine and Coordinator need 'npm install' instead of 'npm ci' 
    # because they don't have the root lockfile in isolation.
    if name in ["Quest Engine", "Swarm Coordinator"]:
        nixpacks_content = """
[phases.install]
cmds = ["npm install"]
"""
        with open(os.path.join(target_dir, "nixpacks.toml"), "w") as f:
            f.write(nixpacks_content)
        print(f"Added nixpacks.toml to force npm install for {name}", flush=True)

    print(f"Linking {name}...", flush=True)
    # Use -p and -s to avoid prompts. Pass \n just in case.
    try:
        cmd = f'railway link -p {PROJECT_ID} -s "{name}"'
        print(f"Running: {cmd}")
        subprocess.run(cmd, shell=True, cwd=target_dir, input=b"\n", capture_output=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Link warning (might need manual link): {e.stderr.decode() if e.stderr else str(e)}", flush=True)

    # Note: If service doesn't exist, link -s might fail.
    # We should run 'railway add' first if link fails?
    # But add requires linked project.
    
    # Deployment
    print(f"Deploying {name}...", flush=True)
    # We use 'railway up' without --service flag if we linked the service directly?
    # Or keep it.
    cmd = f'railway up --service "{name}" --detach'
    res = subprocess.run(cmd, shell=True, cwd=target_dir, capture_output=True)
    if res.returncode == 0:
        print(f"✅ {name} Deployed! Logs: {res.stdout.decode()}", flush=True)
    else:
        print(f"❌ {name} Failed: {res.stderr.decode()}", flush=True)

def main():
    if not os.path.exists(DEPLOY_BASE):
        os.makedirs(DEPLOY_BASE)
    for s in SERVICES:
        deploy_service(s)

if __name__ == "__main__":
    main()
