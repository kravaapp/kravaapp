import ClientHeader, { COLORS } from '@/components/ClientHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Check, ChevronDown, CreditCard, Star } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const planosData = [
  {
    id: 'basico', nome: 'Plano Básico', preco: 180, freq: '2x por semana',
    recursos: ['2 aulas por semana', 'Turmas: Iniciante e Intermediário', 'Horários: até 19h (sem aulas noturnas premium)'],
    atual: false, destaque: false,
  },
  {
    id: 'intermediario', nome: 'Plano Intermediário', preco: 280, freq: '3x por semana',
    recursos: ['3 aulas por semana', 'Todas as turmas Iniciante e Intermediário', 'Todos os horários'],
    atual: true, destaque: false,
  },
  {
    id: 'premium', nome: 'Plano Premium', preco: 380, freq: 'Ilimitado',
    recursos: ['Aulas ilimitadas', 'Todas as turmas incluindo Avançado e Elite', 'Todos os horários', 'Acesso a eventos exclusivos'],
    atual: false, destaque: true,
  },
];

const ProgressBar = ({ progress }: { progress: number }) => (
  <View style={styles.progressBarBackground}>
    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
  </View>
);

export default function PaymentPlans() {
  const [partnerModal, setPartnerModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSendRequest = () => {
    setPartnerModal(false);
    setSelectedPartner(null);
    setPartnerId('');
    // TODO: Add toast notification "Solicitação enviada! Aguarde aprovação do local ✓"
  };

  return (
    <SafeAreaView style={styles.container}>
      <ClientHeader />
      
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollPadding}>
        
        {/* Plano atual destaque */}
        <View style={styles.cardNavy}>
          <Text style={styles.navySubtitle}>SEU PLANO ATUAL</Text>
          <Text style={styles.navyTitle}>Plano Intermediário</Text>
          
          <View style={styles.rowAlignBottom}>
            <Text style={styles.navyPrice}>R$ 280</Text>
            <Text style={styles.navyPriceMonth}>/mês</Text>
          </View>
          
          <Text style={styles.navyDesc}>3 aulas por semana · Todas as turmas Iniciante e Intermediário</Text>
          
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressTextLeft}>7 de 12 check-ins usados</Text>
              <Text style={styles.progressTextRight}>58%</Text>
            </View>
            <ProgressBar progress={58} />
          </View>
          
          <View style={styles.navyBottomRow}>
            <Text style={styles.navyNextBilling}>Próxima cobrança: 01/04/2025</Text>
            <StatusBadge status="confirmado" label='Ativo'/>
          </View>
        </View>

        {/* Planos */}
        <View style={styles.plansContainer}>
          {planosData.map(p => (
            <View key={p.id} style={[styles.card, p.atual && styles.cardActive]}>
              
              {p.destaque && (
                <View style={styles.badgeTopRight}>
                  <View style={styles.badgeWarning}>
                    <Star size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={styles.badgeWarningText}>Mais popular</Text>
                  </View>
                </View>
              )}
              
              {p.atual && (
                <View style={styles.badgeTopRight}>
                  <View style={styles.badgePrimary}>
                    <Text style={styles.badgePrimaryText}>Plano atual</Text>
                  </View>
                </View>
              )}
              
              <Text style={styles.planName}>{p.nome}</Text>
              <View style={styles.rowAlignBottom}>
                <Text style={styles.planPrice}>R${p.preco}</Text>
                <Text style={styles.planPriceMonth}>/mês</Text>
              </View>
              <Text style={styles.planFreq}>{p.freq}</Text>
              
              <View style={styles.featuresList}>
                {p.recursos.map((r, i) => (
                  <View key={i} style={styles.featureItem}>
                    <Check size={14} color="#22c55e" style={styles.featureIcon} />
                    <Text style={styles.featureText}>{r}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.buttonContainer}>
                {p.atual ? (
                  <TouchableOpacity style={styles.btnOutlineDisabled} disabled>
                    <Text style={styles.btnOutlineDisabledText}>Plano atual</Text>
                  </TouchableOpacity>
                ) : p.preco < 280 ? (
                  <TouchableOpacity style={styles.btnOutlineDestructive}>
                    <Text style={styles.btnOutlineDestructiveText}>Fazer downgrade</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.btnSolid}>
                    <Text style={styles.btnSolidText}>Fazer upgrade</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Gympass/Totalpass */}
        <View style={styles.cardLightBlue}>
          <View style={styles.rowAlign}>
            <CreditCard size={16} color={COLORS.mainOrange} />
            <Text style={styles.lightBlueTitle}>Utilizo Gympass ou Totalpass</Text>
          </View>
          <Text style={styles.lightBlueDesc}>
            Se você utiliza Gympass ou Totalpass, solicite a vinculação. Após aprovação pelo local, sua conta será convertida automaticamente.
          </Text>
          <TouchableOpacity style={styles.btnSolid} onPress={() => setPartnerModal(true)}>
            <Text style={styles.btnSolidText}>Solicitar vinculação</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={partnerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Solicitar vinculação com parceiro</Text>
            
            <View style={styles.modalBody}>
              <TouchableOpacity 
                style={styles.selectTrigger}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Text style={selectedPartner ? styles.selectText : styles.selectPlaceholder}>
                  {selectedPartner === 'gympass' ? 'Gympass (Wellhub)' : selectedPartner === 'totalpass' ? 'Totalpass' : 'Selecione o parceiro'}
                </Text>
                <ChevronDown size={16} color={COLORS.mutedForeground} />
              </TouchableOpacity>

              {isDropdownOpen && (
                <View style={styles.selectDropdown}>
                  <TouchableOpacity 
                    style={styles.selectOption} 
                    onPress={() => { setSelectedPartner('gympass'); setIsDropdownOpen(false); }}
                  >
                    <Text style={styles.selectOptionText}>Gympass (Wellhub)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.selectOption} 
                    onPress={() => { setSelectedPartner('totalpass'); setIsDropdownOpen(false); }}
                  >
                    <Text style={styles.selectOptionText}>Totalpass</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput 
                style={styles.input} 
                placeholder="Seu ID no parceiro (opcional)" 
                placeholderTextColor={COLORS.mutedForeground}
                value={partnerId}
                onChangeText={setPartnerId}
              />
              
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>A solicitação será analisada pelo FitPira Arena em até 24h</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.btnSolid} onPress={handleSendRequest}>
              <Text style={styles.btnSolidText}>Enviar solicitação</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  scrollPadding: {
    padding: 20,
    paddingBottom: 40,
  },
  cardNavy: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.mainOrange,
  },
  navySubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  navyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  rowAlignBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  navyPrice: {
    color: COLORS.mainOrange,
    fontSize: 18,
    fontWeight: 'bold',
  },
  navyPriceMonth: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  navyDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  progressSection: {
    marginTop: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressTextLeft: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  progressTextRight: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.mainOrange,
    borderRadius: 4,
  },
  navyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  navyNextBilling: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.subOrange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  cardActive: {
    borderWidth: 2,
    borderColor: COLORS.mainOrange,
  },
  badgeTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  badgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  badgeWarningText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '600',
  },
  badgePrimary: {
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePrimaryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginTop: 4,
  },
  planPriceMonth: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  planFreq: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.mainOrange,
    marginTop: 4,
  },
  featuresList: {
    marginTop: 8,
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.foreground,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 12,
  },
  btnSolid: {
    backgroundColor: COLORS.mainOrange,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnSolidText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  btnOutlineDisabled: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f9fafb',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    opacity: 0.7,
  },
  btnOutlineDisabledText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    fontWeight: '500',
  },
  btnOutlineDestructive: {
    borderWidth: 1,
    borderColor: COLORS.subOrange,
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnOutlineDestructiveText: {
    color: COLORS.destructive,
    fontSize: 12,
    fontWeight: '500',
  },
  cardLightBlue: {
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    padding: 16,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lightBlueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.foreground,
    marginLeft: 8,
  },
  lightBlueDesc: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.foreground,
    marginBottom: 16,
  },
  modalBody: {
    gap: 12,
    marginBottom: 20,
  },
  selectTrigger: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  selectPlaceholder: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },
  selectDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginTop: -8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectOptionText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.foreground,
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 10,
  },
  warningText: {
    color: '#d97706',
    fontSize: 12,
    fontWeight: '500',
  },
});
