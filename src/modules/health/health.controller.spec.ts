import { HealthCheckService } from '@infrastructure/health';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: {
    checkHealth: jest.Mock;
    checkLiveness: jest.Mock;
    checkReadiness: jest.Mock;
  };

  function mockRes() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res as unknown as Response;
  }

  beforeEach(async () => {
    healthCheckService = {
      checkHealth: jest.fn(),
      checkLiveness: jest.fn(),
      checkReadiness: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('healthCheck', () => {
    it('deve responder 200 quando status for ok', async () => {
      const body = { status: 'ok', checks: {} };
      healthCheckService.checkHealth.mockResolvedValue(body);
      const res = mockRes();

      await controller.healthCheck(res);

      expect(healthCheckService.checkHealth).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(body);
    });

    it('deve responder 503 quando status não for ok', async () => {
      const body = { status: 'error', checks: {} };
      healthCheckService.checkHealth.mockResolvedValue(body);
      const res = mockRes();

      await controller.healthCheck(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(body);
    });
  });

  describe('liveness', () => {
    it('deve delegar ao checkLiveness', () => {
      const payload = { status: 'ok' };
      healthCheckService.checkLiveness.mockReturnValue(payload);

      const result = controller.liveness();

      expect(healthCheckService.checkLiveness).toHaveBeenCalled();
      expect(result).toBe(payload);
    });
  });

  describe('readiness', () => {
    it('deve responder 200 quando readiness estiver ok', async () => {
      const body = { status: 'ok' };
      healthCheckService.checkReadiness.mockResolvedValue(body);
      const res = mockRes();

      await controller.readiness(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(body);
    });

    it('deve responder 503 quando readiness não estiver ok', async () => {
      const body = { status: 'fail' };
      healthCheckService.checkReadiness.mockResolvedValue(body);
      const res = mockRes();

      await controller.readiness(res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.json).toHaveBeenCalledWith(body);
    });
  });
});
