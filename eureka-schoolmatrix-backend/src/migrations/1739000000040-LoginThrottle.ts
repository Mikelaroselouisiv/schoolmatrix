import { MigrationInterface, QueryRunner } from 'typeorm';

export class LoginThrottle1739000000040 implements MigrationInterface {
  name = 'LoginThrottle1739000000040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "login_throttle" (
        "identifier" character varying(255) NOT NULL,
        "stage" integer NOT NULL DEFAULT 0,
        "failures_in_stage" integer NOT NULL DEFAULT 0,
        "locked_until" TIMESTAMP WITH TIME ZONE,
        "permanently_blocked" boolean NOT NULL DEFAULT false,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_throttle" PRIMARY KEY ("identifier")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "login_throttle"`);
  }
}
