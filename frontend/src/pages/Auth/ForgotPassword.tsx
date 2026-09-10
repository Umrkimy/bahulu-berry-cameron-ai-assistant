import { Anchor, Button, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { useState } from "react";
import { Link } from "react-router-dom";

import BrandName from "../../components/brand/BrandName";
import { requestPasswordReset } from "../../api/auth";
import { getApiError } from "../../api/errors";
import { useRetryCooldown } from "../../auth/useRetryCooldown";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { remainingSeconds, beginCooldown } = useRetryCooldown();
  const submit = async () => {
    if (!email.trim()) {
      setError("Enter your work email address.");
      return;
    }
    setLoading(true); setError("");
    try { setMessage((await requestPasswordReset(email)).message); } catch (caught) { const apiError = getApiError(caught); beginCooldown(apiError.retryAfterSeconds); setError(apiError.message); } finally { setLoading(false); }
  };
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFDF3", padding: "24px" }}><Stack align="center" gap={28}><BrandName /><Paper shadow="lg" radius="xl" p={{ base: 28, sm: 48 }} withBorder w={480} maw="100%"><form onSubmit={(event) => { event.preventDefault(); void submit(); }}><Stack gap="lg"><div><Title order={1}>Reset password</Title><Text c="dimmed" mt="sm">Enter your work email and we will send a secure reset link if an active account matches it.</Text></div><TextInput type="email" label="Email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} disabled={loading || remainingSeconds > 0} required /><Button type="submit" loading={loading} disabled={loading || remainingSeconds > 0}>{remainingSeconds > 0 ? `Try again in ${remainingSeconds}s` : "Send reset link"}</Button>{message ? <Text c="green" size="sm" role="status">{message}</Text> : null}{error ? <Text c="red" size="sm" role="alert">{error}</Text> : null}<Anchor component={Link} to="/login" size="sm">Back to sign in</Anchor></Stack></form></Paper></Stack></div>;
}
