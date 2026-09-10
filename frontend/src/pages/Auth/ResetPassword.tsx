import { Anchor, Button, Paper, PasswordInput, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import BrandName from "../../components/brand/BrandName";
import { confirmPasswordReset } from "../../api/auth";
import { getApiError } from "../../api/errors";
import { useRetryCooldown } from "../../auth/useRetryCooldown";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const { remainingSeconds, beginCooldown } = useRetryCooldown();
  const submit = async () => { if (!token) { setError("This password link is invalid or incomplete."); return; } if (password.length < 8) { setError("Use at least 8 characters."); return; } if (password !== confirmation) { setError("Passwords do not match."); return; } setLoading(true); setError(""); try { setMessage((await confirmPasswordReset(token, password)).message); } catch (caught) { const apiError = getApiError(caught); beginCooldown(apiError.retryAfterSeconds); setError(apiError.message); } finally { setLoading(false); } };
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFDF3", padding: "24px" }}><Stack align="center" gap={28}><BrandName /><Paper shadow="lg" radius="xl" p={{ base: 28, sm: 48 }} w={480} maw="100%" withBorder><form onSubmit={(event) => { event.preventDefault(); void submit(); }}><Stack gap="lg"><div><Title order={1}>Choose a new password</Title><Text c="dimmed" mt="sm">Use a new password with at least 8 characters.</Text></div><PasswordInput label="New password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} disabled={loading || Boolean(message) || remainingSeconds > 0} required /><PasswordInput label="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.currentTarget.value)} disabled={loading || Boolean(message) || remainingSeconds > 0} required /><Button type="submit" loading={loading} disabled={Boolean(message) || remainingSeconds > 0}>{remainingSeconds > 0 ? `Try again in ${remainingSeconds}s` : "Reset password"}</Button>{message ? <Text c="green" size="sm" role="status">{message} <Anchor component={Link} to="/login">Sign in</Anchor></Text> : null}{error ? <Text c="red" size="sm" role="alert">{error}</Text> : null}</Stack></form></Paper></Stack></div>;
}
