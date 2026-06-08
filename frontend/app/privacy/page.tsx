import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Política de Privacidad — Deployr",
  description: "Cómo Deployr recopila, usa y protege tu información personal.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-on-surface" style={{ background: "#0d0e11" }}>
      <nav className="border-b border-white/10 bg-[#1e1e1e]/70 backdrop-blur-xl h-20 flex items-center px-6 md:px-12">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="deployr" width={120} height={32} className="h-8 w-auto" />
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="font-label-caps text-on-surface-variant mb-4">Última actualización: 8 de junio de 2026</p>
        <h1 className="font-display text-5xl font-bold mb-10">Política de Privacidad</h1>

        <div className="space-y-10 text-on-surface-variant leading-relaxed">

          <Section title="1. Responsable del Tratamiento">
            Deployr S.A. de C.V. (&ldquo;Deployr&rdquo;), con domicilio en Ciudad de México, México, es responsable
            del tratamiento de sus datos personales conforme a la Ley Federal de Protección de Datos Personales en
            Posesión de los Particulares (LFPDPPP) y su Reglamento.
          </Section>

          <Section title="2. Datos Personales que Recopilamos">
            Recopilamos los siguientes tipos de datos personales:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-on-surface">Datos de cuenta:</strong> nombre, apellidos, dirección de correo electrónico, contraseña (cifrada), rol y empresa.</li>
              <li><strong className="text-on-surface">Datos de contacto de clientes:</strong> nombre de empresa, correo electrónico de contacto, teléfono, RFC y domicilio fiscal. Estos datos se almacenan cifrados con AES-256-GCM.</li>
              <li><strong className="text-on-surface">Datos operativos:</strong> tickets de servicio, reportes técnicos, visitas programadas, inventario e historial de actividad.</li>
              <li><strong className="text-on-surface">Datos de facturación:</strong> información de pago procesada directamente por nuestro procesador de pagos certificado PCI-DSS. Deployr no almacena datos de tarjetas.</li>
              <li><strong className="text-on-surface">Datos de uso:</strong> registros de acceso, dirección IP, tipo de navegador y páginas visitadas dentro del Servicio.</li>
            </ul>
          </Section>

          <Section title="3. Finalidades del Tratamiento">
            Tratamos sus datos personales para las siguientes finalidades:
            <p className="mt-3 font-medium text-on-surface text-xs uppercase tracking-wider">Finalidades primarias (necesarias para prestar el Servicio):</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Crear y administrar su cuenta de usuario.</li>
              <li>Prestar las funcionalidades de la plataforma: tickets, despacho, reportes y portal de clientes.</li>
              <li>Procesar pagos y emitir comprobantes.</li>
              <li>Brindar soporte técnico y atención al cliente.</li>
              <li>Cumplir con obligaciones legales y fiscales.</li>
            </ul>
            <p className="mt-4 font-medium text-on-surface text-xs uppercase tracking-wider">Finalidades secundarias (puede oponerse):</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Envío de comunicaciones sobre nuevas funciones, actualizaciones o promociones.</li>
              <li>Análisis estadístico agregado para mejorar el Servicio.</li>
            </ul>
          </Section>

          <Section title="4. Base Legal del Tratamiento">
            El tratamiento de sus datos se basa en: (a) la ejecución del contrato de servicio, (b) el cumplimiento de
            obligaciones legales y (c) su consentimiento para finalidades secundarias. Puede retirar su consentimiento
            para estas últimas en cualquier momento sin que ello afecte la licitud del tratamiento previo.
          </Section>

          <Section title="5. Transferencia de Datos">
            Deployr no vende ni alquila sus datos personales a terceros. Podemos compartirlos únicamente con:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li><strong className="text-on-surface">Proveedores de infraestructura</strong> (hosting en la nube, base de datos) que actúan como encargados del tratamiento bajo acuerdos de confidencialidad.</li>
              <li><strong className="text-on-surface">Procesador de pagos</strong> para gestionar transacciones de forma segura.</li>
              <li><strong className="text-on-surface">Autoridades competentes</strong> cuando sea requerido por ley o resolución judicial.</li>
            </ul>
          </Section>

          <Section title="6. Seguridad de los Datos">
            Implementamos medidas técnicas y organizativas para proteger sus datos, incluyendo:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Cifrado AES-256-GCM para datos sensibles de clientes en la base de datos.</li>
              <li>Comunicaciones cifradas mediante TLS/HTTPS.</li>
              <li>Autenticación basada en tokens JWT con expiración controlada.</li>
              <li>Acceso a datos restringido por rol (ADMIN, TECHNICIAN, CLIENT_USER).</li>
              <li>Auditorías periódicas de seguridad.</li>
            </ul>
          </Section>

          <Section title="7. Conservación de los Datos">
            Sus datos se conservan mientras mantenga una cuenta activa en el Servicio. Tras la cancelación,
            conservamos los datos por 30 días para que pueda exportarlos, transcurrido ese plazo son eliminados
            definitivamente, salvo que la ley exija conservarlos por un período mayor (e.g., datos fiscales: 5 años).
          </Section>

          <Section title="8. Derechos ARCO">
            Como titular de los datos, puede ejercer sus derechos de Acceso, Rectificación, Cancelación y
            Oposición (ARCO) enviando una solicitud a{" "}
            <a href="mailto:privacidad@deployr.mx" className="text-primary hover:underline">privacidad@deployr.mx</a>
            {" "}con:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Nombre completo y correo registrado en el Servicio.</li>
              <li>Descripción clara del derecho que desea ejercer.</li>
              <li>Copia de identificación oficial vigente.</li>
            </ul>
            Responderemos en un plazo máximo de 20 días hábiles conforme a la LFPDPPP.
          </Section>

          <Section title="9. Cookies y Tecnologías de Seguimiento">
            El Servicio utiliza cookies de sesión estrictamente necesarias para el funcionamiento de la autenticación.
            No utilizamos cookies de rastreo publicitario de terceros. Puede configurar su navegador para rechazar
            cookies, pero esto puede afectar el funcionamiento del Servicio.
          </Section>

          <Section title="10. Cambios a esta Política">
            Podemos actualizar esta Política periódicamente. Le notificaremos cambios relevantes por correo
            electrónico o mediante un aviso prominente en el Servicio con al menos 15 días de anticipación. El uso
            continuado del Servicio tras dicho período implica la aceptación de la nueva versión.
          </Section>

          <Section title="11. Contacto">
            Para ejercer sus derechos o consultas sobre privacidad:{" "}
            <a href="mailto:privacidad@deployr.mx" className="text-primary hover:underline">privacidad@deployr.mx</a>
            <br />
            Para consultas generales y soporte:{" "}
            <a href="mailto:hola@deployr.mx" className="text-primary hover:underline">hola@deployr.mx</a>
          </Section>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 py-8 text-center">
        <p className="font-mono text-xs text-on-surface-variant">
          © 2026 Deployr. Todos los derechos reservados. —{" "}
          <Link href="/terms" className="hover:text-primary transition-colors">Términos de Servicio</Link>
          {" · "}
          <Link href="/" className="hover:text-primary transition-colors">Inicio</Link>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-on-surface mb-3">{title}</h2>
      <div className="text-sm">{children}</div>
    </section>
  );
}
