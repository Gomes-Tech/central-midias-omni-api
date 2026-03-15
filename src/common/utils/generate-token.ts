const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

type GenerateTokenProps = {
  options?: {
    size?: number;
  };
};

/**
 * Generates a random alphanumeric token of a specified length.
 *
 * @param {GenerateTokenProps} props - Configuration options for token generation.
 * @param {Object} [props.options] - Optional configuration object.
 * @param {number} [props.options.size=6] - Length of the token to generate. Defaults to 6 characters.
 * @returns {string} A randomly generated alphanumeric token.
 * @example
 * const token = generateToken(); // Generates a 6-character token
 * const longToken = generateToken({ options: { size: 12 } }); // Generates a 12-character token
 */
export function generateToken({
  options = {},
}: GenerateTokenProps = {}): string {
  const { size = 6 } = options;
  let token = '';
  for (let i = 0; i < size; i++) {
    const rand = Math.floor(Math.random() * ALPHANUMERIC.length);
    token += ALPHANUMERIC[rand];
  }
  return token;
}
