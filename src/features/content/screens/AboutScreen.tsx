import type { ReactNode } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { AppButton } from "../../../components/AppButton";
import { BrandLogo } from "../../../components/BrandLogo";
import { Screen } from "../../../components/Screen";
import { StoopyMascot } from "../../../components/StoopyMascot";
import { DEFAULT_PICKUP } from "../../../constants/pickup";
import { colors } from "../../../theme/colors";
import { radii, spacing, typography } from "../../../theme/theme";
import {
  branchSteps,
  impactStats,
  storyTimeline,
  teamMembers,
  testimonials,
  trustPrinciples
} from "../data/aboutContent";

const CONTACT_EMAIL = "hello@stooping.club";

export function AboutScreen() {
  const openEmail = () => {
    void Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Stooping Club`);
  };

  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.hero}>
          <BrandLogo size="medium" />
          <View style={styles.heroTitleRow}>
            <StoopyMascot caption="" size="medium" />
            <Text style={[typography.h1, styles.heroTitle]}>
              Good finds should keep moving.
            </Text>
          </View>
          <Text style={[typography.body, styles.heroBody]}>
            Stooping Club helps neighbors rescue useful household goods, reserve
            them quickly, and pick them up through small local drops. Meet Stoopy,
            our guide to the good stuff.
          </Text>
        </View>

        <View style={styles.twoColumn}>
          <InfoCard title="Mission">
            Make reuse feel local, organized, and easy enough to become a habit.
          </InfoCard>
          <InfoCard title="Vision">
            A network of neighborhood branches where useful items find their next
            home before they are thrown away.
          </InfoCard>
        </View>

        <Section title="Impact">
          <View style={styles.statsGrid}>
            {impactStats.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statDetail}>{stat.detail}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Trust">
          <View style={styles.trustCard}>
            <Text style={styles.trustTitle}>Built for fast, honest pickup orders.</Text>
            <View style={styles.stepList}>
              {trustPrinciples.map((principle) => (
                <View key={principle} style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.trustText}>{principle}</Text>
                </View>
              ))}
            </View>
          </View>
        </Section>

        <Section title="How the story works">
          <View style={styles.timeline}>
            {storyTimeline.map((item, index) => (
              <View key={item.title} style={styles.timelineItem}>
                <View style={styles.timelineMarker}>
                  <Text style={styles.timelineIndex}>{index + 1}</Text>
                </View>
                <View style={styles.timelineCopy}>
                  <Text style={styles.timelineYear}>{item.year}</Text>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Team">
          <View style={styles.teamGrid}>
            {teamMembers.map((member) => (
              <View key={member.name} style={styles.teamCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{member.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.teamCopy}>
                  <Text style={styles.teamName}>{member.name}</Text>
                  <Text style={styles.teamRole}>{member.role}</Text>
                  <Text style={styles.teamBio}>{member.bio}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Branch directors">
          <View style={styles.branchCard}>
            <Text style={styles.branchTitle}>Bring Stooping Club to your block.</Text>
            <Text style={[typography.body, styles.branchBody]}>
              Directors run lightweight local drops using the same playbook:
              source, stage, post, and hand off with care.
            </Text>
            <View style={styles.stepList}>
              {branchSteps.map((step) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepDot} />
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
            <View style={styles.buttonRow}>
              <AppButton
                label="Become a director"
                onPress={openEmail}
                style={styles.actionButton}
              />
              <AppButton
                label="Volunteer"
                onPress={openEmail}
                variant="secondary"
                style={styles.actionButton}
              />
            </View>
          </View>
        </Section>

        <Section title="Happy customers">
          {testimonials.map((testimonial) => (
            <View key={testimonial.attribution} style={styles.customerCard}>
              <Text style={styles.quoteMark}>"</Text>
              <Text style={styles.customerQuote}>{testimonial.quote}</Text>
              <Text style={styles.customerMeta}>{testimonial.attribution}</Text>
              <Text style={styles.customerDetail}>{testimonial.detail}</Text>
            </View>
          ))}
          <Text style={styles.pickupNote}>
            Next pickup: {DEFAULT_PICKUP.window} at {DEFAULT_PICKUP.label}
          </Text>
        </Section>
      </View>
    </Screen>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={typography.h2}>{title}</Text>
      {children}
    </View>
  );
}

function InfoCard({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.xl
  },
  hero: {
    gap: spacing.md
  },
  heroTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  heroTitle: {
    flex: 1
  },
  heroBody: {
    color: colors.ink2
  },
  twoColumn: {
    gap: spacing.md
  },
  infoCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  infoTitle: {
    color: colors.forest,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  infoBody: {
    ...typography.body,
    color: colors.ink
  },
  section: {
    gap: spacing.md
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  statCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 120,
    padding: spacing.lg
  },
  statValue: {
    color: colors.forest,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36
  },
  statLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  statDetail: {
    ...typography.caption,
    marginTop: spacing.xs
  },
  timeline: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.lg
  },
  timelineItem: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  timelineMarker: {
    alignItems: "center",
    backgroundColor: colors.lime,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  timelineIndex: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  timelineCopy: {
    flex: 1,
    gap: spacing.xs
  },
  timelineYear: {
    color: colors.moss,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  timelineTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  timelineBody: {
    ...typography.caption
  },
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  teamCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.forest,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  avatarText: {
    color: colors.card,
    fontSize: 18,
    fontWeight: "900"
  },
  teamCopy: {
    flex: 1,
    gap: 2
  },
  teamName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  teamRole: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: "800"
  },
  teamBio: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17
  },
  trustCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg
  },
  trustTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  trustText: {
    color: colors.ink2,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  branchCard: {
    backgroundColor: colors.forestDark,
    borderRadius: radii.md,
    gap: spacing.md,
    padding: spacing.xl
  },
  branchTitle: {
    color: colors.card,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26
  },
  branchBody: {
    color: "#EAF1E5"
  },
  stepList: {
    gap: spacing.sm
  },
  stepRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  stepDot: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    height: 8,
    width: 8
  },
  stepText: {
    color: colors.card,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  buttonRow: {
    gap: spacing.sm
  },
  actionButton: {
    width: "100%"
  },
  customerCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.lg
  },
  quoteMark: {
    color: colors.rust,
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 48
  },
  customerQuote: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24
  },
  customerMeta: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.md
  },
  customerDetail: {
    ...typography.caption,
    marginTop: spacing.xs
  },
  pickupNote: {
    ...typography.caption,
    textAlign: "center"
  }
});
