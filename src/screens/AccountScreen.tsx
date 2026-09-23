import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, post } from '../lib/api';
import { useApi } from '../lib/hooks';
import type { TokenResponse } from '../lib/types';
import {
  Button,
  Card,
  Empty,
  ErrorView,
  Field,
  Heading,
  Label,
  Loading,
  Screen,
  useTheme,
} from '../components/ui';
import { useNavigation } from '../navigation';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

export function AccountScreen({ path = '/account' }: { path?: string }) {
  if (path === '/login' || path === '/register')
    return <AuthForm register={path === '/register'} />;
  return <AccountHome />;
}

function AuthForm({ register }: { register: boolean }) {
  const nav = useNavigation();
  const colors = useTheme();
  const { setSession, hydrated, token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [locale, setLocale] = useState<'bn' | 'en'>('bn');
  const [accepted, setAccepted] = useState(false);
  const [mode, setMode] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (hydrated && token) nav.replace('/');
  }, [hydrated, token, nav]);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      let response: TokenResponse;
      if (register) {
        if (!name.trim() || !email.trim() || !password)
          throw new Error('Please complete all required fields.');
        if (password !== confirmation)
          throw new Error('Passwords do not match.');
        if (!accepted) throw new Error('Please accept the terms to continue.');
        response = await post<TokenResponse>('/auth/register', {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          password_confirmation: confirmation,
          locale,
          accept_terms: true,
        });
      } else if (mode === 'otp') {
        if (!otpSent) {
          await post('/auth/otp/request', { phone: phone.trim() });
          setOtpSent(true);
          return;
        }
        if (otp.trim().length < 6) throw new Error('Enter the 6-digit code.');
        response = await post<TokenResponse>('/auth/otp/verify', {
          phone: phone.trim(),
          otp: otp.trim(),
        });
      } else
        response = await post<TokenResponse>('/auth/login', {
          email: email.trim(),
          password,
          device_name: 'mobile',
        });
      setSession(response);
      nav.replace('/');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.firstError
          : e instanceof Error
          ? e.message
          : 'Could not complete this request.',
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
      <View style={styles.authHeader}>
        <Text style={styles.brand}>বাংলাদেশ বেতার</Text>
        <Heading>{register ? 'Create your account' : 'Welcome back'}</Heading>
        <Label muted>
          {register
            ? 'One account for Listen, News and Watch.'
            : 'Sign in to save favourites and continue listening.'}
        </Label>
      </View>
      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
      {!register && (
        <View style={styles.switch}>
          {(['email', 'otp'] as const).map(value => (
            <Pressable
              key={value}
              onPress={() => {
                setMode(value);
                setError('');
              }}
            >
              <Label
                style={{ color: mode === value ? colors.accent : colors.muted }}
              >
                {value === 'email' ? 'Email & password' : 'Phone OTP'}
              </Label>
            </Pressable>
          ))}
        </View>
      )}
      {register ? (
        <>
          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Field
            label="Confirm password"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
          />
          <View style={styles.switch}>
            <Pressable onPress={() => setLocale('bn')}>
              <Label
                style={{
                  color: locale === 'bn' ? colors.accent : colors.muted,
                }}
              >
                বাংলা
              </Label>
            </Pressable>
            <Pressable onPress={() => setLocale('en')}>
              <Label
                style={{
                  color: locale === 'en' ? colors.accent : colors.muted,
                }}
              >
                English
              </Label>
            </Pressable>
          </View>
          <Pressable
            style={styles.terms}
            onPress={() => setAccepted(value => !value)}
          >
            <Text
              style={[
                styles.checkbox,
                { color: accepted ? colors.accent : colors.muted },
              ]}
            >
              {accepted ? '☑' : '☐'}
            </Text>
            <Label> I agree to the Terms and Privacy Policy.</Label>
          </Pressable>
        </>
      ) : mode === 'email' ? (
        <>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </>
      ) : (
        <>
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Field
            label="One-time code"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
          />
          {otpSent ? (
            <Label muted>Enter the 6-digit code sent to your phone.</Label>
          ) : null}
        </>
      )}
      <Button
        title={
          mode === 'otp' && !register && !otpSent
            ? 'Send code'
            : register
            ? 'Create account'
            : mode === 'otp'
            ? 'Verify and sign in'
            : 'Sign in'
        }
        onPress={submit}
        loading={busy}
        disabled={
          busy ||
          (register
            ? !name.trim() ||
              !email.trim() ||
              !password ||
              !confirmation ||
              !accepted
            : mode === 'email'
            ? !email.trim() || !password
            : !phone.trim() || (otpSent && otp.trim().length < 6))
        }
      />
      <Pressable
        onPress={() => nav.navigate(register ? '/login' : '/register')}
        style={styles.switchLink}
      >
        <Label muted>
          {register ? 'Already have an account? ' : 'New to Bangladesh Betar? '}
          <Text style={{ color: colors.accent, fontWeight: '800' }}>
            {register ? 'Sign in' : 'Create an account'}
          </Text>
        </Label>
      </Pressable>
    </Screen>
  );
}

function AccountHome() {
  const colors = useTheme();
  const nav = useNavigation();
  const auth = useAuth();
  const ui = useUi();
  const subscription = useApi<any>(auth.token ? '/me/subscription' : null);
  const payments = useApi<any>(auth.token ? '/me/payments' : null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locale, setLocale] = useState<'bn' | 'en'>('bn');
  const [optOut, setOptOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (auth.user) {
      setName(auth.user.name);
      setPhone(auth.user.phone || '');
      setLocale(auth.user.locale || 'bn');
      setOptOut(Boolean(auth.user.preferences?.personalization_opt_out));
    }
  }, [auth.user?.id]);
  if (!auth.hydrated)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  if (!auth.token)
    return (
      <Screen>
        <Empty
          title="Sign in to your account"
          detail="Manage your profile, playlists and subscription."
          action={
            <Button title="Sign in" onPress={() => nav.navigate('/login')} />
          }
        />
      </Screen>
    );
  const save = async () => {
    setBusy(true);
    try {
      await auth.updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        locale,
      });
      ui.setLocale(locale);
      setNotice('Profile updated.');
    } catch (e) {
      setNotice(
        e instanceof ApiError ? e.firstError : 'Could not update your profile.',
      );
    } finally {
      setBusy(false);
    }
  };
  const togglePersonalization = async () => {
    const next = !optOut;
    setOptOut(next);
    try {
      await post('/me/personalization/opt-out', { opt_out: next });
      setNotice(
        next ? 'Personalisation disabled.' : 'Personalisation enabled.',
      );
    } catch (e) {
      setOptOut(!next);
      setNotice(
        e instanceof Error ? e.message : 'Could not update preference.',
      );
    }
  };
  const cancel = async () => {
    setBusy(true);
    try {
      const result = await post<{ message: string }>('/me/subscription/cancel');
      setNotice(result.message);
      await subscription.mutate();
      await auth.refreshMe();
    } catch (e) {
      setNotice(
        e instanceof ApiError ? e.firstError : 'Could not cancel subscription.',
      );
    } finally {
      setBusy(false);
    }
  };
  const sub = subscription.data?.subscription;
  const ent = subscription.data?.entitlements;
  return (
    <Screen>
      <View style={styles.titleRow}>
        <Heading>Account</Heading>
        <Button title="Sign out" secondary onPress={() => void auth.logout()} />
      </View>
      <Card>
        <Heading>Profile</Heading>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field label="Email" value={auth.user?.email || ''} editable={false} />
        <Label muted>Language</Label>
        <View style={styles.switch}>
          <Pressable onPress={() => setLocale('bn')}>
            <Label
              style={{ color: locale === 'bn' ? colors.accent : colors.muted }}
            >
              বাংলা
            </Label>
          </Pressable>
          <Pressable onPress={() => setLocale('en')}>
            <Label
              style={{ color: locale === 'en' ? colors.accent : colors.muted }}
            >
              English
            </Label>
          </Pressable>
        </View>
        <Button
          title={busy ? 'Saving…' : 'Save changes'}
          onPress={save}
          disabled={busy || !name.trim()}
        />
        <Pressable onPress={() => void togglePersonalization()}>
          <Label style={{ color: optOut ? colors.danger : colors.muted }}>
            {optOut ? 'Personalisation is off' : 'Personalisation is on'}
          </Label>
        </Pressable>
      </Card>
      <Card>
        <Heading>Subscription</Heading>
        {subscription.error ? (
          <ErrorView
            error={subscription.error.message}
            onRetry={() => void subscription.mutate()}
          />
        ) : ent?.is_premium && sub ? (
          <>
            <Label>
              {sub.plan || 'Premium'} · {sub.billing_cycle || 'monthly'} ·{' '}
              {sub.status}
            </Label>
            <Label muted>
              {sub.auto_renew
                ? `Renews ${sub.ends_at || ''}`
                : `Active until ${sub.ends_at || ''}`}
            </Label>
            {sub.auto_renew ? (
              <Button
                title="Cancel subscription"
                secondary
                onPress={cancel}
                disabled={busy}
              />
            ) : null}
          </>
        ) : (
          <>
            <Label muted>
              You are on the free plan
              {ent?.max_quality_kbps ? ` · ${ent.max_quality_kbps} kbps` : ''}.
            </Label>
            <Button
              title="Explore Premium"
              onPress={() => nav.navigate('/premium')}
            />
          </>
        )}
      </Card>
      <Card>
        <Heading>Payments</Heading>
        {payments.error ? (
          <ErrorView
            error={payments.error.message}
            onRetry={() => void payments.mutate()}
          />
        ) : payments.isLoading ? (
          <Loading />
        ) : payments.data?.data?.length ? (
          payments.data.data.map((payment: any) => (
            <View key={payment.invoice_no} style={styles.payment}>
              <View style={{ flex: 1 }}>
                <Label>{payment.invoice_no}</Label>
                <Label muted>
                  {payment.method} · {payment.paid_at || 'Pending'} ·{' '}
                  {payment.status}
                </Label>
              </View>
              <Label>
                {payment.amount} {payment.currency}
              </Label>
            </View>
          ))
        ) : (
          <Label muted>No payments yet.</Label>
        )}
      </Card>
      {notice ? <Label style={{ color: colors.accent }}>{notice}</Label> : null}
      <Card>
        <Heading>More</Heading>
        <Button
          title="My library"
          secondary
          onPress={() => nav.navigate('/library')}
        />
        <Button
          title="Help & support"
          secondary
          onPress={() => nav.navigate('/support')}
        />
      </Card>
    </Screen>
  );
}

export default AccountScreen;
const styles = StyleSheet.create({
  authHeader: { alignItems: 'center', gap: 7, marginVertical: 28 },
  brand: { fontSize: 19, fontWeight: '900', color: '#ef3340' },
  error: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,.12)',
    marginBottom: 14,
  },
  switch: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    marginBottom: 14,
  },
  terms: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: { fontSize: 21 },
  switchLink: { alignItems: 'center', paddingVertical: 17 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payment: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
