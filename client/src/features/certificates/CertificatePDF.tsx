import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import type { Certificate } from "./certificates.types";
import GreatVibesUrl from "./GreatVibes-Regular.ttf";

Font.register({
  family: "Great Vibes",
  src: GreatVibesUrl,
});

const CERT_COLORS: Record<string, { primary: string; light: string; dark: string }> = {
  attendance: { primary: "#059669", light: "#d1fae5", dark: "#065f46" },
  completion: { primary: "#2563eb", light: "#dbeafe", dark: "#1e3a8a" },
  volunteer: { primary: "#7c3aed", light: "#ede9fe", dark: "#4c1d95" },
  judge: { primary: "#d97706", light: "#fef3c7", dark: "#92400e" },
};

const styles = StyleSheet.create({
  page: {
    width: 612,
    height: 792,
    fontFamily: "Helvetica",
  },
  outerBorder: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    border: 2,
    borderColor: "#d1d5db",
  },
  innerBorder: {
    position: "absolute",
    top: 28,
    left: 28,
    right: 28,
    bottom: 28,
    border: 1,
    borderColor: "#e5e7eb",
  },
  content: {
    flex: 1,
    padding: 50,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    paddingTop: 20,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    marginRight: 10,
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1e1b4b",
    letterSpacing: 1,
  },
  divider: {
    width: 80,
    height: 2,
    backgroundColor: "#4f46e5",
    marginVertical: 12,
  },
  headerLabel: {
    fontSize: 11,
    textAlign: "center",
    color: "#6b7280",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  certificateTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#1e1b4b",
    marginBottom: 4,
  },
  middleSection: {
    alignItems: "center",
    paddingVertical: 10,
  },
  certifyText: {
    fontSize: 11,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 8,
  },
  recipientName: {
    fontSize: 38,
    fontFamily: "Great Vibes",
    textAlign: "center",
    color: "#1e1b4b",
    marginBottom: 4,
  },
  nameUnderline: {
    width: 280,
    height: 1,
    backgroundColor: "#c7d2fe",
    marginBottom: 16,
  },
  description: {
    fontSize: 10.5,
    textAlign: "center",
    color: "#4b5563",
    lineHeight: 1.7,
    maxWidth: 400,
    marginBottom: 20,
  },
  typeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 10,
  },
  typeText: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  bottomSection: {
    paddingBottom: 10,
  },
  infoBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    padding: 14,
    marginBottom: 16,
    border: 1,
    borderColor: "#e5e7eb",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 8.5,
    color: "#9ca3af",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 8.5,
    color: "#374151",
  },
  verifyText: {
    fontSize: 7.5,
    textAlign: "center",
    color: "#9ca3af",
    marginTop: 8,
  },
  cornerOrnament: {
    position: "absolute",
    width: 40,
    height: 40,
  },
  cornerTL: {
    top: 35,
    left: 35,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: "#4f46e5",
  },
  cornerTR: {
    top: 35,
    right: 35,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#4f46e5",
  },
  cornerBL: {
    bottom: 35,
    left: 35,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: "#4f46e5",
  },
  cornerBR: {
    bottom: 35,
    right: 35,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: "#4f46e5",
  },
});

function formatDate(dateStr: string | null) {
  if (!dateStr) return "---";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const CERT_LABELS: Record<string, string> = {
  attendance: "Certificate of Attendance",
  completion: "Certificate of Completion",
  volunteer: "Certificate of Volunteering",
  judge: "Certificate of Judging",
};

export default function CertificatePDF({ cert }: { cert: Certificate }) {
  const colors = CERT_COLORS[cert.certificate_type] || CERT_COLORS.attendance;

  return (
    <Document>
      <Page size={[612, 792]} style={styles.page}>
        {/* Decorative borders */}
        <View style={styles.outerBorder} />
        <View style={styles.innerBorder} />

        {/* Corner ornaments */}
        <View style={[styles.cornerOrnament, styles.cornerTL]} />
        <View style={[styles.cornerOrnament, styles.cornerTR]} />
        <View style={[styles.cornerOrnament, styles.cornerBL]} />
        <View style={[styles.cornerOrnament, styles.cornerBR]} />

        <View style={styles.content}>
          {/* Top: Logo + Title */}
          <View style={styles.topSection}>
            <View style={styles.logoRow}>
              <View style={styles.logoIcon} />
              <Text style={styles.logoText}>Hackathon Hub</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.headerLabel}>Certificate</Text>
            <Text style={styles.certificateTitle}>
              {CERT_LABELS[cert.certificate_type] || "Certificate"}
            </Text>
          </View>

          {/* Middle: Recipient + Description */}
          <View style={styles.middleSection}>
            <Text style={styles.certifyText}>This is proudly presented to</Text>
            <Text style={styles.recipientName}>{cert.full_name}</Text>
            <View style={styles.nameUnderline} />
            <Text style={styles.description}>
              In recognition of outstanding participation and contribution to the
              event, demonstrating dedication, teamwork, and technical excellence.
            </Text>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: colors.light },
              ]}
            >
              <Text style={[styles.typeText, { color: colors.dark }]}>
                {cert.certificate_type.charAt(0).toUpperCase() +
                  cert.certificate_type.slice(1)}
              </Text>
            </View>
          </View>

          {/* Bottom: Info + Verification */}
          <View style={styles.bottomSection}>
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Issued On</Text>
                <Text style={styles.infoValue}>{formatDate(cert.issued_at)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Certificate ID</Text>
                <Text style={styles.infoValue}>
                  {cert.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              {cert.verification_code && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Verification Code</Text>
                  <Text style={styles.infoValue}>{cert.verification_code}</Text>
                </View>
              )}
            </View>
            <Text style={styles.verifyText}>
              Verify at hackathon-hub/verify using the verification code above
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
