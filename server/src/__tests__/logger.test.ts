import { jest } from '@jest/globals';
import { logger, log } from '../lib/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    // Spy on winston logger methods
    jest.spyOn(logger, 'info').mockImplementation(() => logger);
    jest.spyOn(logger, 'error').mockImplementation(() => logger);
    jest.spyOn(logger, 'warn').mockImplementation(() => logger);
    jest.spyOn(logger, 'debug').mockImplementation(() => logger);
  });

  describe('logger instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have standard logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('log helper', () => {
    describe('log.info', () => {
      it('should log simple message', () => {
        log.info('Test message');
        expect(logger.info).toHaveBeenCalled();
      });

      it('should log message with data', () => {
        log.info('Test message', { key: 'value' });
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Test message'));
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('key'));
      });
    });

    describe('log.error', () => {
      it('should log simple error message', () => {
        log.error('Error occurred');
        expect(logger.error).toHaveBeenCalled();
      });

      it('should log Error object', () => {
        const error = new Error('Test error');
        log.error('Something failed', error);
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Test error'),
          expect.objectContaining({ stack: expect.any(String) })
        );
      });

      it('should log error data object', () => {
        log.error('Failed', { code: 500 });
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('500'),
          expect.any(Object)
        );
      });
    });

    describe('log.warn', () => {
      it('should log warning message', () => {
        log.warn('Warning message');
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should log warning with data', () => {
        log.warn('Warning', { detail: 'info' });
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('detail'));
      });
    });

    describe('log.debug', () => {
      it('should log debug message', () => {
        log.debug('Debug info');
        expect(logger.debug).toHaveBeenCalled();
      });

      it('should log debug with data', () => {
        log.debug('Debug', { value: 123 });
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('123'));
      });
    });
  });
});
