import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, post } from '../lib/api';
import { useApi } from '../lib/hooks';
import type { Plan } from '../lib/types';
import {
  Button,
  Card,
  Empty,
  ErrorView,
  Heading,
  Label,
  Loading,
  Screen,
  useTheme,
} from '../components/ui';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

const METHODS = ['bkash', 'nagad', 'rocket', 'card'];
function features(plan: Plan) {
  const f = plan.features || {};
  return [
    plan.code === 'premium' ? 'Premium collection' : 'Free catalogue',
    f.ads ? 'Ad-supported' : 'Ad-free',
    `${Number(f.max_quality_kbps || 128)} kbps quality`,
    f.skips_per_hour != null
      ? `${f.skips_per_hour} skips per hour`
      : 'Unlimited skips',
    ...(f.offline_downloads ? ['Offline downloads'] : []),
    ...(f.equalizer ? ['Equalizer'] : []),
  ];
}

export function PremiumScreen() {
  const colors = useTheme();
  const auth = useAuth();
  const ui = useUi();
  const plans = useApi<{ data: Plan[] }>('/plans');
  const subscription = useApi<any>(auth.token ? '/me/subscription' : null);
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selected, setSelected] = useState<Plan | null>(null);
  const [method, setMethod] = useState('bkash');
  const [promo, setPromo] = useState('');
  const [trial, setTrial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const premium = Boolean(subscription.data?.entitlements?.is_premium);
  const choose = (plan: Plan, startTrial: boolean) => {
    if (!auth.token) {
      ui.openLoginPrompt(
        startTrial
          ? 'Sign in to start your trial.'
          : 'Sign in to upgrade to Premium.',
      );
      return;
    }
    setTrial(startTrial);
    setNotice('');
    setSelected(plan);
  };
  const subscribe = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await post<{ message: string }>(
        '/me/subscription/subscribe',
        {
          plan_code: selected.code,
          billing_cycle: cycle,
          method,
          promo_code: promo.trim().toUpperCase() || undefined,
          start_trial: trial,
        },
      );
      setNotice(result.message);
      setSelected(null);
      await subscription.mutate();
      await auth.refreshMe();
    } catch (e) {
      setNotice(
        e instanceof ApiError
          ? e.firstError
          : e instanceof Error
          ? e.message
          : 'Payment could not be completed.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Card style={{ alignItems: 'center' }}>
        <Text style={styles.crown}>♛</Text>
        <Heading>Premium listening</Heading>
        <Label muted>
          Enjoy the full Bangladesh Betar collection, higher quality and offline
          listening.
        </Label>
        {premium ? (
          <Label style={{ color: colors.premium }}>
            ✓ You are a Premium member.
          </Label>
        ) : null}
      </Card>
      <View style={styles.billing}>
        {(['monthly', 'annual'] as const).map(value => (
          <Pressable
            key={value}
            onPress={() => setCycle(value)}
            style={[
              styles.billingItem,
              {
                backgroundColor: cycle === value ? colors.text : colors.surface,
              },
            ]}
          >
            <Text style={{ color: cycle === value ? colors.bg : colors.text }}>
              {value === 'annual' ? 'Annual · save more' : 'Monthly'}
            </Text>
          </Pressable>
        ))}
      </View>
      {plans.error ? (
        <ErrorView
          error={plans.error.message}
          onRetry={() => void plans.mutate()}
        />
      ) : plans.isLoading ? (
        <Loading />
      ) : plans.data?.data?.length ? (
        plans.data.data.map(plan => {
          const isPremium = plan.code === 'premium';
          const price =
            cycle === 'annual' ? plan.price_annual : plan.price_monthly;
          return (
            <Card
              key={plan.id}
              style={isPremium ? { borderColor: colors.premium } : undefined}
            >
              <Heading>{plan.name}</Heading>
              <Label muted>{plan.description || ''}</Label>
              <Text style={[styles.price, { color: colors.text }]}>
                {price === 0 ? 'Free' : `${price} ${plan.currency}`}
                {price > 0 ? ` / ${cycle === 'annual' ? 'year' : 'month'}` : ''}
              </Text>
              {features(plan).map(item => (
                <Label key={item}>✓ {item}</Label>
              ))}
              {isPremium ? (
                <Button
                  title={premium ? 'Current plan' : `Get Premium · ${cycle}`}
                  onPress={() => choose(plan, false)}
                  disabled={premium}
                />
              ) : (
                <Label muted>Your current plan</Label>
              )}
              {isPremium && plan.trial_days > 0 && !premium ? (
                <Button
                  title={`Start ${plan.trial_days}-day trial`}
                  secondary
                  onPress={() => choose(plan, true)}
                />
              ) : null}
            </Card>
          );
        })
      ) : (
        <Empty title="Plans unavailable" detail="Please try again later." />
      )}
      {notice ? (
        <Text style={{ color: colors.accent, fontWeight: '700' }}>
          {notice}
        </Text>
      ) : null}
      {selected ? (
        <Card>
          <Heading>{trial ? 'Start trial' : 'Complete checkout'}</Heading>
          <Label>
            {selected.name} · {cycle}
          </Label>
          <View style={styles.methods}>
            {METHODS.map(value => (
              <Pressable
                key={value}
                onPress={() => setMethod(value)}
                style={[
                  styles.method,
                  {
                    borderColor:
                      method === value ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={{ color: colors.text }}>{value}</Text>
              </Pressable>
            ))}
          </View>
          {!trial ? (
            <TextInput
              value={promo}
              onChangeText={setPromo}
              autoCapitalize="characters"
              placeholder="Promo code"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
            />
          ) : null}
          <Button
            title={
              busy ? 'Processing…' : trial ? 'Start trial' : 'Confirm payment'
            }
            onPress={subscribe}
            loading={busy}
            disabled={busy}
          />
          <Button title="Cancel" secondary onPress={() => setSelected(null)} />
        </Card>
      ) : null}
    </Screen>
  );
}

export default PremiumScreen;
const styles = StyleSheet.create({
  crown: { fontSize: 42, color: '#d7a843' },
  billing: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    borderRadius: 24,
    gap: 4,
  },
  billingItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  price: { fontSize: 28, fontWeight: '900', marginVertical: 10 },
  methods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  method: {
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
});
