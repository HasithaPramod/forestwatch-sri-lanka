import { Injectable, Logger } from '@nestjs/common';

export type LocalPushResult = {
  attempted: number;
  delivered: number;
};

@Injectable()
export class LocalPushProvider {
  private readonly logger = new Logger(LocalPushProvider.name);

  async send(tokens: string[], notification: { title: string; body: string }): Promise<LocalPushResult> {
    const attempted = tokens.length;
    this.logger.log(
      `local push hook title="${notification.title}" attempted=${attempted} delivered=0 (no Expo/FCM credentials)`,
    );
    return { attempted, delivered: 0 };
  }
}
