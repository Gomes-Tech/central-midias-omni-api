import {
  ALLOWED_UPLOAD_EXTENSIONS,
  ALLOWED_UPLOAD_MIME_TYPES,
  ALLOWED_UPLOAD_TYPES_DESCRIPTION,
  getUploadFileExtension,
  isAllowedUploadFile,
} from './allowed-upload-files';

function file(originalname: string, mimetype?: string): Express.Multer.File {
  return {
    originalname,
    mimetype: mimetype ?? '',
    fieldname: 'file',
    encoding: '7bit',
    size: 0,
    destination: '',
    filename: '',
    path: '',
    buffer: Buffer.alloc(0),
  } as Express.Multer.File;
}

describe('allowed-upload-files', () => {
  describe('ALLOWED_UPLOAD_EXTENSIONS', () => {
    it('deve conter extensões em minúsculas sem ponto', () => {
      expect(ALLOWED_UPLOAD_EXTENSIONS.has('png')).toBe(true);
      expect(ALLOWED_UPLOAD_EXTENSIONS.has('docx')).toBe(true);
      expect(ALLOWED_UPLOAD_EXTENSIONS.has('PDF')).toBe(false);
    });
  });

  describe('ALLOWED_UPLOAD_MIME_TYPES', () => {
    it('deve incluir PNG e PDF', () => {
      expect(ALLOWED_UPLOAD_MIME_TYPES.has('image/png')).toBe(true);
      expect(ALLOWED_UPLOAD_MIME_TYPES.has('application/pdf')).toBe(true);
    });
  });

  describe('ALLOWED_UPLOAD_TYPES_DESCRIPTION', () => {
    it('deve ser string não vazia para documentação / mensagens', () => {
      expect(typeof ALLOWED_UPLOAD_TYPES_DESCRIPTION).toBe('string');
      expect(ALLOWED_UPLOAD_TYPES_DESCRIPTION.length).toBeGreaterThan(10);
    });
  });

  describe('getUploadFileExtension', () => {
    it('deve extrair extensão em minúsculas sem ponto', () => {
      expect(getUploadFileExtension('Foto.PNG')).toBe('png');
      expect(getUploadFileExtension('relatorio.PDF')).toBe('pdf');
    });

    it('deve usar a última extensão quando houver múltiplos pontos', () => {
      expect(getUploadFileExtension('arquivo.backup.pdf')).toBe('pdf');
    });

    it('deve retornar string vazia quando não houver extensão', () => {
      expect(getUploadFileExtension('semextensao')).toBe('');
    });
  });

  describe('isAllowedUploadFile', () => {
    it('deve aceitar extensão permitida com MIME correspondente', () => {
      expect(isAllowedUploadFile(file('doc.pdf', 'application/pdf'))).toBe(
        true,
      );
      expect(isAllowedUploadFile(file('img.jpeg', 'image/jpeg'))).toBe(true);
    });

    it('deve aceitar extensão permitida com MIME vazio', () => {
      expect(isAllowedUploadFile(file('doc.pdf', ''))).toBe(true);
    });

    it('deve aceitar extensão permitida com application/octet-stream', () => {
      expect(
        isAllowedUploadFile(file('video.mp4', 'application/octet-stream')),
      ).toBe(true);
    });

    it('deve aceitar extensão permitida com binary/octet-stream', () => {
      expect(isAllowedUploadFile(file('a.png', 'binary/octet-stream'))).toBe(
        true,
      );
    });

    it('deve normalizar MIME com espaços e maiúsculas', () => {
      expect(isAllowedUploadFile(file('x.PNG', '  IMAGE/PNG  '))).toBe(true);
    });

    it('deve rejeitar extensão não listada', () => {
      expect(
        isAllowedUploadFile(file('malware.exe', 'application/octet-stream')),
      ).toBe(false);
    });

    it('deve rejeitar quando extensão é permitida mas MIME não é aceito', () => {
      expect(isAllowedUploadFile(file('foto.png', 'text/plain'))).toBe(false);
    });
  });
});
