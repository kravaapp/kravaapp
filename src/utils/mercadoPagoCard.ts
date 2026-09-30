import { CardPaymentFields } from "@/types/payments.types";

export type MercadoPagoCardProps = {
  publicKey: string;
  amount: number;
  customerName: string;
  customerDocument: string;
  onToken: (fields: CardPaymentFields) => Promise<void>;
  onError: (message: string) => void;
};

const scriptValue = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

/** Apenas os campos protegidos do MP recebem número, validade e CVV. */
export function createMercadoPagoCardHtml(props: Omit<MercadoPagoCardProps, "onToken" | "onError">) {
  return `<!doctype html><html lang="pt-BR"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;color:#111827;background:#fff}
    label{display:block;font-size:13px;font-weight:700;margin:12px 0 6px}.field,select{height:50px;width:100%;border:1px solid #dcdde1;border-radius:12px;padding:12px;background:#fff;color:#111827;font-size:15px}
    .row{display:flex;gap:12px}.row>div{flex:1;min-width:0}button{width:100%;height:48px;border:0;background:#E85C07;color:#fff;border-radius:12px;font-size:14px;font-weight:700;margin-top:20px}
    button:disabled{opacity:.5}#brand{min-height:18px;margin:10px 0 2px;font-size:13px;color:#6b7280}
  </style></head><body>
    <label>Número do cartão</label><div id="number" class="field"></div>
    <div class="row"><div><label>Validade</label><div id="expiry" class="field"></div></div>
    <div><label>CVV</label><div id="security" class="field"></div></div></div>
    <p id="brand">Carregando formulário seguro...</p>
    <label for="installments">Parcelas</label><select id="installments" disabled><option>Informe o cartão</option></select>
    <button id="submit" disabled>Pagar com cartão</button>
    <script>
    const config=${scriptValue(props)};
    const submit=document.getElementById('submit');
    const select=document.getElementById('installments');
    let busy=false, method=null, binVersion=0, ready=0;
    function updateButton(){submit.disabled=busy||ready<3||!method||select.disabled;}
    function unlock(){busy=false;submit.textContent='Pagar com cartão';updateButton();}
    window.kravaUnlockCard=unlock;
    window.addEventListener('message',function(event){if(event.source===window.parent&&event.data==='krava-unlock')unlock();});
    function send(data){
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(data));
      else window.parent.postMessage(data,'*');
    }
    function showError(message){send({type:'card-error',message:message});}
    async function init(){
      try{
        const mp=new MercadoPago(config.publicKey,{locale:'pt-BR'});
        const number=mp.fields.create('cardNumber',{placeholder:'Número do cartão'}).mount('number');
        const expiry=mp.fields.create('expirationDate',{placeholder:'MM/AA'}).mount('expiry');
        const security=mp.fields.create('securityCode',{placeholder:'CVV'}).mount('security');
        [number,expiry,security].forEach(function(field){
          field.on('ready',function(){ready++;updateButton();});
          field.on('error',function(){showError('Não foi possível carregar os campos do cartão. Reabra o formulário.');});
        });
        document.getElementById('brand').textContent='Informe os dados do cartão.';
        number.on('binChange',async function(event){
          const version=++binVersion;method=null;select.disabled=true;select.replaceChildren();updateButton();
          if(!event.bin)return;
          try{
            const response=await mp.getPaymentMethods({bin:event.bin});
            if(version!==binVersion)return;
            const match=response.results.find(function(item){return item.payment_type_id==='credit_card'&&['master','visa','elo','amex','hipercard'].includes(item.id);});
            if(!match)throw new Error('unsupported');
            const costs=await mp.getInstallments({amount:String(config.amount),bin:event.bin});
            if(version!==binVersion)return;
            const plan=costs.find(function(item){return item.payment_method_id===match.id;})||costs[0];
            if(!plan||!plan.payer_costs||!plan.payer_costs.length)throw new Error('installments');
            const settings=match.settings&&match.settings[0];
            if(settings){number.update({settings:settings.card_number});security.update({settings:settings.security_code});}
            plan.payer_costs.forEach(function(cost){const option=document.createElement('option');option.value=cost.installments;option.textContent=cost.recommended_message;select.appendChild(option);});
            method=match.id;select.disabled=false;document.getElementById('brand').textContent=match.name;updateButton();
          }catch(e){if(version===binVersion){showError('Cartão não disponível para esta cobrança. Confira os dados ou use Pix.');}}
        });
        submit.onclick=async function(){
          if(submit.disabled||busy)return;
          const submittedVersion=binVersion;
          const submittedMethod=method;
          const submittedInstallments=Number(select.value);
          busy=true;updateButton();submit.textContent='Processando...';
          try{
            const token=await mp.fields.createCardToken({cardholderName:config.customerName,identificationType:config.customerDocument.length===14?'CNPJ':'CPF',identificationNumber:config.customerDocument});
            if(!token||!token.id||submittedVersion!==binVersion)throw new Error('token');
            send({type:'card-token',fields:{cardToken:token.id,installments:submittedInstallments,cardPaymentMethodId:submittedMethod}});
          }catch(e){showError('Não foi possível validar o cartão. Confira os dados e tente novamente.');unlock();}
        };
      }catch(e){showError('Não foi possível carregar o checkout. Reabra o formulário ou use Pix.');}
    }
    const sdk=document.createElement('script');sdk.src='https://sdk.mercadopago.com/js/v2';sdk.onload=init;
    sdk.onerror=function(){showError('Não foi possível carregar o Mercado Pago. Verifique sua conexão.');};document.head.appendChild(sdk);
    </script></body></html>`;
}
