declare module 'sanitize-html' {
  namespace sanitizeHtml {
    interface IOptions {
      allowedTags?: string[];
      allowedAttributes?: Record<string, string[]>;
      allowedStyles?: Record<string, Record<string, RegExp[]>>;
      allowedSchemes?: string[];
      allowProtocolRelative?: boolean;
      nonTextTags?: string[];
      parser?: {
        lowerCaseTags?: boolean;
        lowerCaseAttributeNames?: boolean;
      };
      transformTags?: Record<
        string,
        (
          tagName: string,
          attribs: Record<string, string>,
        ) => { tagName: string; attribs: Record<string, string> }
      >;
    }
  }

  function sanitizeHtml(value: string, options?: sanitizeHtml.IOptions): string;

  export default sanitizeHtml;
}
