let iniciado = false;

/*
 * Aviso "Conectando con el servidor" mientras Render despierta.
 * La región de estado se crea vacía al cargar la página para que los lectores
 * de pantalla anuncien el texto cuando aparece.
 */
export function iniciarAvisoServidor() {
  if (iniciado || !document.body) return;
  iniciado = true;
  const nodo = document.createElement('p');
  nodo.className = 'pf-aviso-servidor';
  nodo.setAttribute('role', 'status');
  nodo.setAttribute('aria-live', 'polite');
  nodo.dataset.avisoServidor = '';
  nodo.hidden = true;
  document.body.appendChild(nodo);
  window.addEventListener('pf:servidor-despertando', () => {
    nodo.hidden = false;
    nodo.textContent = 'Conectando con el servidor, puede tardar un momento.';
  });
  window.addEventListener('pf:servidor-listo', () => {
    nodo.textContent = '';
    nodo.hidden = true;
  });
}
