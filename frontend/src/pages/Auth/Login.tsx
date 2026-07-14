import {
  Anchor,
  Button,
  Checkbox,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import BrandName from "../../components/brand/BrandName";

import { loginRequest } from "../../api/auth";

import useAuth from "../../auth/useAuth";

export default function Login() {
  const { login } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) {
      return;
    }

    try {
      setLoading(true);

      setError("");

      const data = await loginRequest(email, password);

      login(data.access_token);

      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
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

            <Checkbox label="Remember me" size="md" />

            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}

            <Button
              fullWidth
              size="lg"
              radius="md"
              loading={loading}
              onClick={handleLogin}
            >
              Login
            </Button>

            <Text size="sm" ta="center" c="dimmed">
              Forgot password?{" "}
              <Anchor href="#" onClick={(event) => event.preventDefault()}>
                Contact administrator
              </Anchor>
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
