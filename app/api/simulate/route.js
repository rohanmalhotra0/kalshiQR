import { spawn } from 'node:child_process';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function runPython(args) {
  return new Promise((resolve, reject) => {
    const root = process.cwd();
    const script = path.join(root, 'legacy-python', 'run_pipeline_json.py');
    const python = path.join(root, '.venv', 'bin', 'python');
    const child = spawn(python, [script, ...args], { cwd: root, env: process.env });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Simulation failed with exit code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error('Simulation returned invalid JSON.'));
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

  const cliArgs = Object.entries(params).flatMap(([k, v]) => [`--${k}`, `${v}`]);
  try {
    const data = await runPython(cliArgs);
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: 'Failed to run model simulation', details: error.message },
      { status: 500 },
    );
  }
}
