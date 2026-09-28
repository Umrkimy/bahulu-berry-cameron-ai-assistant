import type { Metadata } from "next";

import { AboutPage } from "../_components/information-page";

export const metadata: Metadata = { title: "About" };
export default function About() { return <AboutPage />; }
