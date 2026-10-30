"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/form";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";

export function SignupPasswordField() {
  const [password, setPassword] = useState("");
  return (
    <Field label="Senha">
      <Input
        name="password"
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordStrengthMeter password={password} />
    </Field>
  );
}
