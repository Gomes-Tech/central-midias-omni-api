declare module 'sanitize-html' {
  namespace sanitizeHtml {
    interface IOptions {
      allowedTags?: string[];
      allowedAttributes?: Record<string, string[]>;
      allowedStyles?: Record<string, Record<string, RegExp[]>>;
    }
  }

  function sanitizeHtml(value: string, options?: sanitizeHtml.IOptions): string;

  export default sanitizeHtml;
}
