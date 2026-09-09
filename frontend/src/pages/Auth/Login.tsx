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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFFDF3",
        padding: "40px",
      }}
    >
      <Stack align="center" gap={32}>
        {/* Brand */}

        <BrandName />

        <Paper
          shadow="lg"
          radius="xl"
          p={48}
          withBorder
          style={{
            width: "480px",
            maxWidth: "95vw",
          }}
        >
          <Stack gap={28}>
            <div>
              <Title order={1} size={36} fw={700}>
                Welcome back
              </Title>

              <Text c="dimmed" size="md" mt="sm">
                Sign in to your Bahulu Berry Cameron admin dashboard
              </Text>
            </div>

            <TextInput
              label="Email"
              placeholder="admin@bahuluberry.com"
              size="lg"
              radius="md"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />

            <PasswordInput
              label="Password"
              placeholder="Your password"
              size="lg"
              radius="md"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
            />

            {error && (
              <Text c="red" size="sm" role="alert">
                {error}
              </Text>
            )}

            {params.get("reason") === "session-expired" && !error ? <Text c="orange" size="sm" role="status">Your session expired. Please sign in again.</Text> : null}

            <Button
              fullWidth
              size="lg"
              radius="md"
              loading={loading}
              onClick={handleLogin}
              disabled={loading || remainingSeconds > 0}
            >
              {remainingSeconds > 0 ? `Try again in ${remainingSeconds}s` : "Login"}
            </Button>

            <Text size="sm" ta="center" c="dimmed">
              Forgot password?{" "}
              <Anchor component={Link} to="/forgot-password">Reset your password</Anchor>
            </Text>
          </Stack>
        </Paper>

        <Text size="sm" c="dimmed">
          © 2026 Bahulu Berry Cameron
        </Text>
      </Stack>
    </div>
  );
}
