import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function pickPython(root) {
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  const venvPython = path.join(root, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) {
    return venvPython;
  }
  return 'python3';
}

function runPipeline(args) {
  return new Promise((resolve, reject) => {
    const root = process.cwd();
    const scriptPath = path.join(root, 'legacy-python', 'run_pipeline_json.py');
    const python = pickPython(root);
    const child = spawn(python, [scriptPath, ...args], {
      cwd: root,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Model process failed with exit code ${code}.`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Model returned invalid JSON payload.'));
      }
    });
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const params = {
    industry: searchParams.get('industry') ?? 'tech',
    company_size: searchParams.get('company_size') ?? 'startup',
    job_level: searchParams.get('job_level') ?? 'entry',
    tenure_years: searchParams.get('tenure_years') ?? '1',
    salary: searchParams.get('salary') ?? '120000',
    n_paths: searchParams.get('n_paths') ?? '3000',
    horizon_years: searchParams.get('horizon_years') ?? '10',
  };

  const cliArgs = Object.entries(params).flatMap(([key, value]) => [`--${key}`, String(value)]);

  try {
    const result = await runPipeline(cliArgs);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to run Python model',
        details: error instanceof Error ? error.message : 'Unknown model failure',
      },
      { status: 500 },
    );
  }
}
