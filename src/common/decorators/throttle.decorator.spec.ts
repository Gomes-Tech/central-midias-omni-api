import {
  ThrottleLogin,
  ThrottlePasswordReset,
  ThrottleTokenGeneration,
  ThrottleUpload,
} from './throttle.decorator';

const LIMIT_KEY = 'THROTTLER:LIMIT';
const TTL_KEY = 'THROTTLER:TTL';

describe('throttle.decorator', () => {
  describe('ThrottleLogin', () => {
    class C {
      @ThrottleLogin()
      login() {}
    }

    it('deve limitar a 5 tentativas em 15 minutos', () => {
      expect(
        Reflect.getMetadata(`${LIMIT_KEY}default`, C.prototype.login),
      ).toBe(5);
      expect(Reflect.getMetadata(`${TTL_KEY}default`, C.prototype.login)).toBe(
        15 * 60 * 1000,
      );
    });
  });

  describe('ThrottleUpload', () => {
    class C {
      @ThrottleUpload()
      up() {}
    }

    it('deve limitar a 10 uploads por hora', () => {
      expect(Reflect.getMetadata(`${LIMIT_KEY}default`, C.prototype.up)).toBe(
        10,
      );
      expect(Reflect.getMetadata(`${TTL_KEY}default`, C.prototype.up)).toBe(
        60 * 60 * 1000,
      );
    });
  });

  describe('ThrottleTokenGeneration', () => {
    class C {
      @ThrottleTokenGeneration()
      token() {}
    }

    it('deve limitar a 3 por hora', () => {
      expect(
        Reflect.getMetadata(`${LIMIT_KEY}default`, C.prototype.token),
      ).toBe(3);
      expect(Reflect.getMetadata(`${TTL_KEY}default`, C.prototype.token)).toBe(
        60 * 60 * 1000,
      );
    });
  });

  describe('ThrottlePasswordReset', () => {
    class C {
      @ThrottlePasswordReset()
      reset() {}
    }

    it('deve limitar a 3 por hora', () => {
      expect(
        Reflect.getMetadata(`${LIMIT_KEY}default`, C.prototype.reset),
      ).toBe(3);
      expect(Reflect.getMetadata(`${TTL_KEY}default`, C.prototype.reset)).toBe(
        60 * 60 * 1000,
      );
    });
  });
});
