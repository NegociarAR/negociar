"use client";

export function scorePassword(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = scorePassword(password);
  // tokens: bg-danger (0-1), bg-warning (2), bg-primary (3), bg-success (4)
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-primary", "bg-success"];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= score ? colors[score] : "bg-subtle"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
