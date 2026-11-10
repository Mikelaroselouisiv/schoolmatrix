import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Compteur de connexions échouées, par identifiant saisi (email / téléphone).
 * Hors sync : chaque nœud (cloud / école) tient ses propres verrous courts.
 * Le blocage définitif passe aussi par users.active = false (répliqué).
 */
@Entity('login_throttle')
export class LoginThrottle {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  identifier: string;

  /** 0 = première série ; après chaque verrou la série suivante. */
  @Column({ type: 'int', default: 0 })
  stage: number;

  @Column({ type: 'int', default: 0 })
  failures_in_stage: number;

  @Column({ type: 'timestamptz', nullable: true })
  locked_until: Date | null;

  @Column({ default: false })
  permanently_blocked: boolean;

  @UpdateDateColumn()
  updated_at: Date;
}
