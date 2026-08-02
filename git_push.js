const { execSync } = require('child_process');

try {
  console.log('--- Running git add . ---');
  console.log(execSync('git add .', { encoding: 'utf8' }));

  console.log('--- Running git status ---');
  const statusOutput = execSync('git status', { encoding: 'utf8' });
  console.log(statusOutput);

  // Verification check: ensure secrets are not tracked
  if (statusOutput.includes('.env') || statusOutput.includes('google-vision-key.json')) {
    console.error('CRITICAL: Secret files detected in git status! Aborting commit.');
    process.exit(1);
  }

  console.log('--- Running git commit ---');
  try {
    const commitOutput = execSync(
      'git commit -m "feat: Phase 6.5 - Share Bill via WhatsApp wa.me link and status tracking"',
      { encoding: 'utf8' }
    );
    console.log(commitOutput);
  } catch (cErr) {
    console.log('Commit note:', cErr.stdout || cErr.message);
  }

  console.log('--- Running git push ---');
  const pushOutput = execSync('git push', { encoding: 'utf8' });
  console.log(pushOutput);

  console.log('--- Git Push Completed Successfully ---');
} catch (err) {
  console.error('Git command failed:', err.message);
  if (err.stdout) console.log('stdout:', err.stdout.toString());
  if (err.stderr) console.error('stderr:', err.stderr.toString());
  process.exit(1);
}
