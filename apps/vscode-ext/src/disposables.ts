export function disposeAll(subscriptions: readonly { dispose: () => unknown }[]) {
  for (const subscription of subscriptions.toReversed()) {
    subscription.dispose();
  }
}
