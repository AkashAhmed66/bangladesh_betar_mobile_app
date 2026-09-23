import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, post } from '../lib/api';
import { useApi } from '../lib/hooks';
import { useAuth } from '../stores/auth';
import { useNavigation } from '../navigation';
import {
  Button,
  Card,
  ErrorView,
  Empty,
  Field,
  Heading,
  Label,
  Loading,
  Screen,
  useTheme,
} from '../components/ui';

const FEEDBACK = ['general', 'suggestion', 'complaint', 'technical'];
const ISSUES = ['broken_audio', 'wrong_metadata', 'inappropriate', 'other'];
const REASONS = ['inappropriate', 'copyright', 'abuse', 'spam', 'other'];

export function SupportScreen({ path = '/support' }: { path?: string }) {
  const currentPath = useNavigation().path;
  const report = (path === '/support' ? currentPath : path).match(
    /^\/assets\/([^/]+)\/report$/,
  );
  if (report) return <ReportForm id={report[1]} />;
  return <SupportHome />;
}

function SupportHome() {
  const nav = useNavigation();
  const auth = useAuth();
  const colors = useTheme();
  const mine = useApi<any>(auth.token ? '/me/submissions' : null);
  const [mode, setMode] = useState<'feedback' | 'problem'>('feedback');
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [issueType, setIssueType] = useState('broken_audio');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = async () => {
    const body = mode === 'feedback' ? message.trim() : description.trim();
    if (!body || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result =
        mode === 'feedback'
          ? await post<{ message: string }>('/feedback', {
              category,
              subject: subject.trim() || undefined,
              message: body,
            })
          : await post<{ message: string }>('/issue-reports', {
              issue_type: issueType,
              description: body,
            });
      setNotice(result.message);
      setSubject('');
      setMessage('');
      setDescription('');
      if (auth.token) await mine.mutate();
    } catch (e) {
      setNotice(
        e instanceof ApiError
          ? e.firstError
          : e instanceof Error
          ? e.message
          : 'Could not submit.',
      );
    } finally {
      setBusy(false);
    }
  };
  const chip = (
    value: string,
    current: string,
    choose: (v: string) => void,
  ) => (
    <Pressable
      key={value}
      onPress={() => choose(value)}
      style={[
        styles.chip,
        {
          borderColor: current === value ? colors.accent : colors.border,
          backgroundColor: current === value ? colors.accent : colors.surface,
        },
      ]}
    >
      <Text style={{ color: current === value ? '#fff' : colors.text }}>
        {value.replace('_', ' ')}
      </Text>
    </Pressable>
  );
  return (
    <Screen>
      <Heading>Help & support</Heading>
      <Label muted>
        Send feedback or report a problem, then track its status.
      </Label>
      <Card>
        <View style={styles.tabs}>
          <Button
            title="Feedback"
            secondary={mode !== 'feedback'}
            onPress={() => setMode('feedback')}
          />
          <Button
            title="Report a problem"
            secondary={mode !== 'problem'}
            onPress={() => setMode('problem')}
          />
        </View>
        {mode === 'feedback' ? (
          <>
            <Label muted>Category</Label>
            <View style={styles.chips}>
              {FEEDBACK.map(value => chip(value, category, setCategory))}
            </View>
            <Field
              label="Subject (optional)"
              value={subject}
              onChangeText={setSubject}
              maxLength={255}
            />
            <Field
              label="Message"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
          </>
        ) : (
          <>
            <Label muted>Issue type</Label>
            <View style={styles.chips}>
              {ISSUES.map(value => chip(value, issueType, setIssueType))}
            </View>
            <Field
              label="What happened?"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />
          </>
        )}
        <Button
          title={
            busy
              ? 'Sending…'
              : mode === 'feedback'
              ? 'Send feedback'
              : 'Submit issue'
          }
          onPress={submit}
          loading={busy}
          disabled={
            busy || !(mode === 'feedback' ? message.trim() : description.trim())
          }
        />
        {notice ? (
          <Label style={{ color: colors.accent }}>{notice}</Label>
        ) : null}
        <Label muted>
          To report a specific recording, use Report from that recording.
        </Label>
      </Card>
      <Card>
        <Heading>Your submissions</Heading>
        {!auth.token ? (
          <>
            <Label muted>Sign in to track submissions.</Label>
            <Button title="Sign in" onPress={() => nav.navigate('/login')} />
          </>
        ) : mine.error ? (
          <ErrorView
            error={mine.error.message}
            onRetry={() => void mine.mutate()}
          />
        ) : mine.isLoading ? (
          <Loading />
        ) : mine.data?.data?.length ? (
          mine.data.data.map((item: any) => (
            <View key={item.id} style={styles.submission}>
              <View style={{ flex: 1 }}>
                <Label>{item.type_label}</Label>
                {item.subject_line ? <Label>{item.subject_line}</Label> : null}
                <Label muted>{item.message || ''}</Label>
                <Label muted>{item.created_at || ''}</Label>
              </View>
              <Text
                style={[
                  styles.status,
                  {
                    color:
                      item.status === 'resolved' ? '#3ddc97' : colors.accent,
                  },
                ]}
              >
                {item.status.replace('_', ' ')}
              </Text>
            </View>
          ))
        ) : (
          <Empty
            title="No submissions"
            detail="Your feedback and reports will appear here."
          />
        )}
      </Card>
    </Screen>
  );
}

function ReportForm({ id }: { id: string }) {
  const nav = useNavigation();
  const auth = useAuth();
  const colors = useTheme();
  const asset = useApi<any>(`/assets/${id}`);
  const [reason, setReason] = useState('inappropriate');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    if (!auth.token || busy) return;
    setBusy(true);
    setError('');
    try {
      await post('/reports', {
        reportable_type: 'audio_asset',
        reportable_id: Number(id),
        reason,
        details: details.trim() || undefined,
      });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.firstError
          : e instanceof Error
          ? e.message
          : 'Could not submit the report.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Pressable onPress={nav.back}>
        <Label style={{ color: colors.accent }}>‹ Back</Label>
      </Pressable>
      <Heading>Report this recording</Heading>
      <Label muted>Tell us what is wrong. Our team reviews every report.</Label>
      <Card>
        {asset.isLoading ? (
          <Loading />
        ) : asset.data?.data ? (
          <>
            <Label>{asset.data.data.title}</Label>
            <Label muted>
              {asset.data.data.programme ||
                asset.data.data.station ||
                asset.data.data.archive_no ||
                'Archive recording'}
            </Label>
          </>
        ) : (
          <Label muted>Recording not found.</Label>
        )}
      </Card>
      {done ? (
        <Card>
          <Heading>Report submitted</Heading>
          <Label muted>
            Thank you. You can follow its status in Help & support.
          </Label>
          <Button
            title="Track status"
            onPress={() => nav.replace('/support')}
          />
        </Card>
      ) : !auth.token ? (
        <Card>
          <Label muted>Sign in to submit a report.</Label>
          <Button title="Sign in" onPress={() => nav.navigate('/login')} />
        </Card>
      ) : (
        <Card>
          <Label muted>Reason</Label>
          <View style={styles.chips}>
            {REASONS.map(value => (
              <Pressable
                key={value}
                onPress={() => setReason(value)}
                style={[
                  styles.chip,
                  {
                    borderColor:
                      reason === value ? colors.accent : colors.border,
                    backgroundColor:
                      reason === value ? colors.accent : colors.surface,
                  },
                ]}
              >
                <Text
                  style={{ color: reason === value ? '#fff' : colors.text }}
                >
                  {value.replace('_', ' ')}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field
            label="Details (optional)"
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={1000}
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
          <Button
            title="Submit report"
            onPress={submit}
            loading={busy}
            disabled={busy}
          />
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        </Card>
      )}
    </Screen>
  );
}

export default SupportScreen;
const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  submission: {
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2b3746',
    paddingVertical: 11,
  },
  status: { fontWeight: '800' },
});
