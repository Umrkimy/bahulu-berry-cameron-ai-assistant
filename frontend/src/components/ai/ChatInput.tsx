import { useEffect, useRef, useState } from "react";
import { ActionIcon, Box, Group, Select, Text, Textarea, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowUp, IconMicrophone, IconMicrophoneOff } from "@tabler/icons-react";

const DICTATION_LANGUAGE_KEY = "bahulu-berry-ai-dictation-language";

type DictationLanguage = "AUTO" | "EN" | "MS";

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const languageOptions = [
  { value: "AUTO", label: "Voice: Auto" },
  { value: "EN", label: "Voice: English" },
  { value: "MS", label: "Voice: Bahasa Melayu" },
];

function getSpeechRecognitionConstructor() {
  const browserWindow = window as SpeechRecognitionWindow;
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
}

function resolveLanguage(language: DictationLanguage) {
  if (language === "EN") return "en-MY";
  if (language === "MS") return "ms-MY";
  return navigator.language || "en-MY";
}

function appendTranscript(existing: string, transcript: string) {
  const cleanedTranscript = transcript.trim();
  if (!cleanedTranscript) return existing;
  return existing.trim() ? `${existing.trimEnd()} ${cleanedTranscript}` : cleanedTranscript;
}

function getDictationErrorMessage(error: string) {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Microphone permission is needed to use dictation.";
  }
  if (error === "audio-capture") {
    return "No microphone was found. Check your device and try again.";
  }
  if (error === "no-speech") {
    return "No speech was detected. Please try again.";
  }
  if (error === "network") {
    return "Browser dictation is unavailable right now. Please type your message instead.";
  }
  return "Dictation could not start. Please try again or type your message instead.";
}

interface ChatInputProps {
  onSend: (message: string) => void;
  loading?: boolean;
}

export default function ChatInput({ onSend, loading = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [dictationLanguage, setDictationLanguage] = useState<DictationLanguage>(() => {
    const savedLanguage = localStorage.getItem(DICTATION_LANGUAGE_KEY);
    return savedLanguage === "EN" || savedLanguage === "MS" ? savedLanguage : "AUTO";
  });
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const messageBeforeDictationRef = useRef("");
  const ignoreRecognitionResultsRef = useRef(false);

  const isDictationSupported = Boolean(getSpeechRecognitionConstructor());

  useEffect(() => {
    localStorage.setItem(DICTATION_LANGUAGE_KEY, dictationLanguage);
  }, [dictationLanguage]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const stopDictation = () => {
    recognitionRef.current?.stop();
  };

  const handleSend = () => {
    const trimmed = message.trim();

    if (!trimmed || loading) {
      return;
    }

    ignoreRecognitionResultsRef.current = true;
    recognitionRef.current?.abort();
    onSend(trimmed);
    setMessage("");
  };

  const startDictation = () => {
    if (loading) return;

    if (recognitionRef.current) {
      stopDictation();
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      notifications.show({
        title: "Dictation unavailable",
        message: "Use Chrome or Edge to use browser dictation, or type your message instead.",
        color: "red",
      });
      return;
    }

    const recognition = new Recognition();
    ignoreRecognitionResultsRef.current = false;
    messageBeforeDictationRef.current = message;
    recognition.lang = resolveLanguage(dictationLanguage);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      if (ignoreRecognitionResultsRef.current) return;

      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setMessage(appendTranscript(messageBeforeDictationRef.current, `${finalTranscript}${interimTranscript}`));
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setIsListening(false);
      if (event.error !== "aborted") {
        notifications.show({
          title: "Dictation stopped",
          message: getDictationErrorMessage(event.error),
          color: "red",
        });
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      notifications.show({
        title: "Dictation unavailable",
        message: "Dictation could not start. Please try again or type your message instead.",
        color: "red",
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box>
      <Group className="ai-input-controls" justify="space-between" mb={6} gap="xs">
        <Select
          aria-label="Dictation language"
          data={languageOptions}
          disabled={loading || isListening || !isDictationSupported}
          size="xs"
          value={dictationLanguage}
          w={175}
          onChange={(value) => {
            if (value === "AUTO" || value === "EN" || value === "MS") {
              setDictationLanguage(value);
            }
          }}
        />
        <Text size="xs" c="dimmed" ta="right">
          Dictation uses your browser&apos;s speech service. Review text before sending.
        </Text>
      </Group>

      <Box style={{ position: "relative" }}>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening…" : "Message Bahulu Berry Cameron AI..."}
          autosize
          minRows={1}
          maxRows={6}
          disabled={loading}
          radius="xl"
          styles={{
            input: {
              paddingRight: 102,
              paddingTop: 14,
              paddingBottom: 14,
            },
          }}
        />

        <Tooltip label={isListening ? "Stop dictation" : isDictationSupported ? "Start dictation" : "Dictation requires Chrome or Edge"}>
          <ActionIcon
            aria-label={isListening ? "Stop dictation" : "Start dictation"}
            color={isListening ? "red" : "gray"}
            disabled={loading || !isDictationSupported}
            radius="xl"
            size={36}
            variant={isListening ? "filled" : "light"}
            onClick={startDictation}
            style={{ position: "absolute", right: 48, bottom: 8 }}
          >
            {isListening ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
          </ActionIcon>
        </Tooltip>

        <ActionIcon
          aria-label="Send message"
          size={36}
          radius="xl"
          variant="filled"
          color="dark"
          onClick={handleSend}
          disabled={!message.trim() || loading}
          loading={loading}
          style={{ position: "absolute", right: 8, bottom: 8 }}
        >
          <IconArrowUp size={18} />
        </ActionIcon>
      </Box>
    </Box>
  );
}
