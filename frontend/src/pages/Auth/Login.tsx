import {
  Anchor,
  Button,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import BrandName from "../../components/brand/BrandName";

import { getCurrentAdmin, loginRequest } from "../../api/auth";
import { getApiError } from "../../api/errors";

import useAuth from "../../auth/useAuth";
import { useRetryCooldown } from "../../auth/useRetryCooldown";

export default function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { remainingSeconds, beginCooldown } = useRetryCooldown();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      await loginRequest(email, password);
    } catch (caught) {
      const apiError = getApiError(caught);
      beginCooldown(apiError.retryAfterSeconds);
      setError(apiError.message);
      setLoading(false);
      return;
    }

    try {
      const currentAdmin = await getCurrentAdmin();
      login(currentAdmin);
      const next = params.get("next");
      navigate(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch {
      setError("Your sign-in was accepted, but this browser could not confirm the session. Refresh and try again. If it continues, open a private window or clear this site’s data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <Stack gap="lg" w="100%" maw={380}>
        <BrandName showDescription={false} />

        <Paper withBorder p="xl" radius="md">
          <form onSubmit={(event) => { event.preventDefault(); void handleLogin(); }} noValidate>
            <Stack gap="md">
              <div>
                <Title order={1} size={20}>
                  Welcome back
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                  Sign in to the Bahulu Berry Cameron dashboard.
                </Text>
              </div>

              <TextInput
                label="Email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
              />

              <PasswordInput
                label="Password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />

              {error && (
                <Text c="red.7" size="sm" role="alert">
                  {error}
                </Text>
              )}

              {params.get("reason") === "session-expired" && !error ? <Text c="orange.8" size="sm" role="status">Your session expired. Please sign in again.</Text> : null}

              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={loading || remainingSeconds > 0}
              >
                {remainingSeconds > 0 ? `Try again in ${remainingSeconds}s` : "Login"}
              </Button>

              <Anchor component={Link} to="/forgot-password" size="sm" ta="center" c="dimmed">Forgot your password?</Anchor>
            </Stack>
          </form>
        </Paper>

        <Text size="xs" c="dimmed" ta="center">
          © 2026 Bahulu Berry Cameron
        </Text>
      </Stack>
    </div>
  );
}
