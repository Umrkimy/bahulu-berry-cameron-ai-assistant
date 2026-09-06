import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MantineProvider } from "@mantine/core";
import { LazyMotion, domAnimation, MotionConfig } from "motion/react";
import "@mantine/core/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/nprogress/styles.css";
import "@mantine/dates/styles.css";
import { ModalsProvider } from "@mantine/modals";

import App from "./App";
import { theme } from "./theme";
import "./styles.css";

import { AuthProvider } from "./auth/AuthProvider";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LazyMotion features={domAnimation} strict>
          <MotionConfig reducedMotion="user">
            <MantineProvider theme={theme} defaultColorScheme="light">
              <ModalsProvider>
                <AuthProvider>
                  <App />
                </AuthProvider>
              </ModalsProvider>
            </MantineProvider>
          </MotionConfig>
        </LazyMotion>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
