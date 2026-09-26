import { Notifications } from "@mantine/notifications";

export default function ActionNotifications() {
  return (
    <Notifications
      position="top-right"
      autoClose={4500}
      limit={4}
      zIndex={4000}
    />
  );
}
