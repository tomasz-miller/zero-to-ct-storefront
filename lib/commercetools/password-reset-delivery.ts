import 'server-only';

/**
 * Dev-only escape hatch: `next dev` with AUTH_DEV_EXPOSE_RESET_TOKEN=true returns the
 * reset link in the API response because the storefront has no email transport.
 */
export function isPasswordResetDevLinkEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.NODE_ENV === 'development' && env.AUTH_DEV_EXPOSE_RESET_TOKEN === 'true'
  );
}

/**
 * A reset token is only minted when something can deliver it. No email transport
 * exists; when one is added, OR it in here.
 */
export function isPasswordResetDeliveryConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isPasswordResetDevLinkEnabled(env);
}
