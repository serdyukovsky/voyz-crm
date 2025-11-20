import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';

export interface WebhookGuardOptions {
  validateSignature?: (payload: any, signature: string, headers: Record<string, string>) => Promise<boolean>;
  validateIp?: (ip: string) => boolean;
  allowedIps?: string[];
}

@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(private readonly options: WebhookGuardOptions) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = request.body;
    const headers = request.headers;
    const signature = headers['x-signature'] || headers['x-hub-signature-256'] || headers['authorization'];
    const ip = request.ip || request.connection.remoteAddress;

    // IP validation
    if (this.options.validateIp && !this.options.validateIp(ip)) {
      throw new UnauthorizedException('IP address not allowed');
    }

    if (this.options.allowedIps && !this.options.allowedIps.includes(ip)) {
      throw new UnauthorizedException('IP address not in whitelist');
    }

    // Signature validation
    if (this.options.validateSignature && signature) {
      return this.options.validateSignature(payload, signature, headers);
    }

    // If no validation is configured, allow by default (for development)
    return true;
  }
}

