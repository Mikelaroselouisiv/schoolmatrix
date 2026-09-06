import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  DateField,
  EmptyState,
  ErrorBanner,
  LoadingBlock,
  Screen,
  SegmentedControl,
  Title,
} from '../../components/ui';
import { useSchool } from '../../context/SchoolContext';
import { toYYYYMMDD } from '../../lib/format';
import {
  createHomework,
  getAttendance,
  getHomework,
  getScheduleSlots,
  getTeacherClasses,
  getTeacherSubjectsInClass,
  listHomework,
  saveAttendanceBulk,
  saveHomeworkGrade,
  saveSlotMaterials,
  type AttendanceStatus,
  type AttendanceStudent,
  type ClassItem,
  type HomeworkAssignment,
  type HomeworkKind,
  type ScheduleSlot,
  type SubjectItem,
} from '../../services/api';
import { saveAttendanceWithQueue } from '../../lib/mutationQueue';
import { useNetwork } from '../../context/NetworkContext';
import { colors } from '../../theme/tokens';
import type { WorkStackParamList } from '../../navigation/types';
import { AccessDenied, useCanAccess } from '../../lib/access';

type Props = NativeStackScreenProps<WorkStackParamList, 'TeacherHub'>;
type HubTab = 'travaux' | 'appel' | 'materiel';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Présent' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Retard' },
  { value: 'EXCUSED', label: 'Excusé' },
];

export function TeacherHubScreen({}: Props) {
  const allowed = useCanAccess('teacher-hub') || useCanAccess('grades');
  const { theme } = useSchool();
  const [tab, setTab] = useState<HubTab>('travaux');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classId, setClassId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await getTeacherClasses();
        setClasses(list);
        if (list[0]) setClassId(list[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger vos classes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!allowed) return <AccessDenied />;
  if (loading) return <LoadingBlock />;

  return (
    <Screen>
      <Title>Tableau professeur</Title>
      <SegmentedControl
        options={[
          { id: 'travaux', label: 'Travaux' },
          { id: 'appel', label: 'Appel' },
          { id: 'materiel', label: 'Matériel' },
        ]}
        value={tab}
        onChange={(id) => setTab(id as HubTab)}
      />
      {error ? <ErrorBanner message={error} /> : null}
      {classes.length === 0 ? (
        <EmptyState title="Aucune classe affectée" />
      ) : tab === 'travaux' ? (
        <HomeworkPanel classes={classes} classId={classId} onClassId={setClassId} accent={theme.accent} />
      ) : tab === 'appel' ? (
        <AttendancePanel
          classes={classes.filter((c) => c.can_take_attendance)}
          classId={classId}
          onClassId={setClassId}
        />
      ) : (
        <MaterialsPanel
          classes={classes.filter((c) => c.can_set_materials)}
          classId={classId}
          onClassId={setClassId}
        />
      )}
    </Screen>
  );
}

function ClassChips({
  classes,
  classId,
  onClassId,
}: {
  classes: ClassItem[];
  classId: string;
  onClassId: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
      {classes.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onClassId(c.id)}
          style={[styles.chip, classId === c.id && styles.chipOn]}
        >
          <Text style={[styles.chipText, classId === c.id && styles.chipTextOn]}>{c.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function AttendancePanel({
  classes,
  classId,
  onClassId,
}: {
  classes: ClassItem[];
  classId: string;
  onClassId: (id: string) => void;
}) {
  const { online } = useNetwork();
  const activeId = classes.some((c) => c.id === classId) ? classId : classes[0]?.id || '';
  const [date, setDate] = useState(toYYYYMMDD());
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!activeId) return;
    try {
      const data = await getAttendance(activeId, date);
      setStudents(data.students || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement appel impossible');
    }
  }, [activeId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  if (classes.length === 0) {
    return (
      <EmptyState title="Appel réservé au préscolaire et aux 1er / 2e cycles fondamentaux" />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <ClassChips classes={classes} classId={activeId} onClassId={onClassId} />
      <DateField value={date} onChange={setDate} />
      {error ? <ErrorBanner message={error} /> : null}
      {students.map((s) => (
        <View key={s.id} style={styles.row}>
          <Text style={styles.name}>
            {s.last_name} {s.first_name}
          </Text>
          <View style={styles.pills}>
            {STATUSES.map((st) => (
              <Pressable
                key={st.value}
                onPress={() =>
                  setStudents((prev) =>
                    prev.map((x) => (x.id === s.id ? { ...x, status: st.value } : x)),
                  )
                }
                style={[
                  styles.pill,
                  (s.status || 'PRESENT') === st.value && styles.pillOn,
                ]}
              >
                <Text style={styles.pillText}>{st.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Button
        title={saving ? 'Enregistrement…' : 'Enregistrer l’appel'}
        disabled={saving || students.length === 0}
        onPress={async () => {
          setSaving(true);
          try {
            const records = students.map((s) => ({
              student_id: s.id,
              status: (s.status as string) || 'PRESENT',
            }));
            if (online) await saveAttendanceBulk(activeId, date, records);
            else await saveAttendanceWithQueue(activeId, date, records);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Enregistrement impossible');
          } finally {
            setSaving(false);
          }
        }}
      />
    </ScrollView>
  );
}

function HomeworkPanel({
  classes,
  classId,
  onClassId,
  accent,
}: {
  classes: ClassItem[];
  classId: string;
  onClassId: (id: string) => void;
  accent: string;
}) {
  const [kind, setKind] = useState<HomeworkKind>('DEVOIR');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [due, setDue] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [list, setList] = useState<HomeworkAssignment[]>([]);
  const [detail, setDetail] = useState<HomeworkAssignment | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!classId) return;
    (async () => {
      try {
        const [subs, hw] = await Promise.all([
          getTeacherSubjectsInClass(classId),
          listHomework(classId),
        ]);
        setSubjects(subs);
        setList(hw);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement travaux impossible');
      }
    })();
  }, [classId]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <ClassChips classes={classes} classId={classId} onClassId={onClassId} />
      {error ? <ErrorBanner message={error} /> : null}
      <Text style={styles.label}>Nouveau travail</Text>
      <SegmentedControl
        options={[
          { id: 'DEVOIR', label: 'Devoir' },
          { id: 'LECON', label: 'Leçon' },
        ]}
        value={kind}
        onChange={(id) => setKind(id as HomeworkKind)}
      />
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Titre"
        style={styles.input}
      />
      <TextInput
        value={instructions}
        onChangeText={setInstructions}
        placeholder="Consigne"
        multiline
        style={[styles.input, { minHeight: 72 }]}
      />
      <DateField value={due} onChange={setDue} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSubjectId(s.id === subjectId ? '' : s.id)}
            style={[styles.chip, subjectId === s.id && styles.chipOn]}
          >
            <Text style={[styles.chipText, subjectId === s.id && styles.chipTextOn]}>{s.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Button
        title="Publier"
        disabled={!title.trim()}
        onPress={async () => {
          try {
            await createHomework({
              kind,
              title: title.trim(),
              instructions: instructions.trim() || null,
              due_date: due || null,
              class_id: classId,
              subject_id: subjectId || null,
            });
            setTitle('');
            setInstructions('');
            setList(await listHomework(classId));
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Publication impossible');
          }
        }}
      />
      {list.map((a) => (
        <Pressable
          key={a.id}
          onPress={async () => setDetail(await getHomework(a.id))}
          style={[styles.card, { borderColor: accent }]}
        >
          <Text style={styles.kind}>{a.kind === 'DEVOIR' ? 'Devoir' : 'Leçon'}</Text>
          <Text style={styles.cardTitle}>{a.title}</Text>
          {a.due_date ? <Text style={styles.meta}>Pour le {a.due_date}</Text> : null}
        </Pressable>
      ))}
      {detail?.students?.map((s) => (
        <GradeEditor
          key={s.student_id}
          student={s}
          onSave={async (score, comment) => {
            const next = await saveHomeworkGrade(detail.id, {
              student_id: s.student_id,
              score,
              comment,
            });
            setDetail(next);
          }}
        />
      ))}
    </ScrollView>
  );
}

function GradeEditor({
  student,
  onSave,
}: {
  student: {
    student_id: string;
    first_name: string;
    last_name: string;
    score: string | null;
    comment: string | null;
  };
  onSave: (score: string, comment: string) => Promise<void>;
}) {
  const [score, setScore] = useState(student.score ?? '');
  const [comment, setComment] = useState(student.comment ?? '');
  return (
    <View style={styles.row}>
      <Text style={styles.name}>
        {student.last_name} {student.first_name}
      </Text>
      <TextInput
        value={score}
        onChangeText={setScore}
        onEndEditing={() => void onSave(score, comment)}
        placeholder="Note"
        style={styles.score}
      />
      <TextInput
        value={comment}
        onChangeText={setComment}
        onEndEditing={() => void onSave(score, comment)}
        placeholder="Commentaire"
        style={styles.input}
      />
    </View>
  );
}

function MaterialsPanel({
  classes,
  classId,
  onClassId,
}: {
  classes: ClassItem[];
  classId: string;
  onClassId: (id: string) => void;
}) {
  const activeId = classes.some((c) => c.id === classId) ? classId : classes[0]?.id || '';
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const list = await getScheduleSlots(activeId);
        setSlots(list);
        const next: Record<string, string> = {};
        for (const s of list) next[s.id] = s.materials || '';
        setDrafts(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Horaire indisponible');
      }
    })();
  }, [activeId]);

  if (classes.length === 0) {
    return <EmptyState title="Matériel : 1er et 2e cycles fondamentaux" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <ClassChips classes={classes} classId={activeId} onClassId={onClassId} />
      {error ? <ErrorBanner message={error} /> : null}
      {slots.map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {DAYS[s.day_of_week] ?? s.day_of_week} · {s.start_time}–{s.end_time} · {s.subject_name}
          </Text>
          <TextInput
            value={drafts[s.id] ?? ''}
            onChangeText={(t) => setDrafts((d) => ({ ...d, [s.id]: t }))}
            placeholder="Matériel à apporter (une ligne par item)"
            multiline
            style={[styles.input, { minHeight: 72 }]}
          />
          <Button
            title="Enregistrer"
            onPress={() => void saveSlotMaterials(s.id, drafts[s.id] || null)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingBottom: 40 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextOn: { color: colors.surface },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontWeight: '700', color: colors.text, marginBottom: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillOn: { backgroundColor: colors.border },
  pillText: { fontSize: 12, fontWeight: '600' },
  label: { fontWeight: '700', marginTop: 8, marginBottom: 6, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    color: colors.text,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    backgroundColor: colors.surface,
  },
  kind: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  cardTitle: { fontWeight: '800', color: colors.text, marginTop: 4 },
  meta: { color: colors.textMuted, marginTop: 4 },
  score: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    width: 80,
    marginBottom: 6,
  },
});
