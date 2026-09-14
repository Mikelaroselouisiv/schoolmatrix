import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeAppResume } from '../lib/birthdayNotifications';
import { syncMorningDutyNotifications } from '../lib/morningDutyNotifications';
import { isTeacherRole } from '../lib/permissions';

/** Notifie le professeur la veille d’une affectation (rentrée / drapeau). */
export function TeacherMorningDutyReminders() {
  const { user, roleName, loading } = useAuth();
  const userId = user?.id ?? user?.userId ?? null;

  useEffect(() => {
    if (loading || !user || !isTeacherRole(roleName) || userId == null) return;
    void syncMorningDutyNotifications(roleName, userId);
    return subscribeAppResume(() => {
      void syncMorningDutyNotifications(roleName, userId);
    });
  }, [loading, user, roleName, userId]);

  return null;
}
