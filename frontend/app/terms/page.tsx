import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Términos de Servicio — Deployr",
  description: "Términos y condiciones de uso de la plataforma Deployr.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen text-on-surface" style={{ background: "#0d0e11" }}>
      <nav className="border-b border-white/10 bg-[#1e1e1e]/70 backdrop-blur-xl h-20 flex items-center px-6 md:px-12">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="deployr" width={120} height={32} className="h-8 w-auto" />
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="font-label-caps text-on-surface-variant mb-4">Última actualización: 8 de junio de 2026</p>
        <h1 className="font-display text-5xl font-bold mb-10">Términos de Servicio</h1>

        <div className="space-y-10 text-on-surface-variant leading-relaxed">

          <Section title="1. Aceptación de los Términos">
            Al acceder o utilizar la plataforma Deployr (&ldquo;el Servicio&rdquo;), operada por Deployr S.A. de C.V.
            (&ldquo;Deployr&rdquo;, &ldquo;nosotros&rdquo;), usted acepta quedar vinculado por estos Términos de
            Servicio. Si no está de acuerdo con alguno de los términos aquí descritos, no utilice el Servicio.
          </Section>

          <Section title="2. Descripción del Servicio">
            Deployr es una plataforma de gestión de operaciones de mantenimiento en campo que permite a empresas
            administrar técnicos, clientes, tickets de servicio, visitas programadas e inventario a través de una
            interfaz web y un portal de autoservicio para clientes. El Servicio se presta en modalidad SaaS
            (Software como Servicio).
          </Section>

          <Section title="3. Registro y Cuenta">
            <ul className="list-disc pl-5 space-y-2">
              <li>Debe proporcionar información veraz, completa y actualizada al registrarse.</li>
              <li>Es responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Debe notificarnos de inmediato ante cualquier uso no autorizado de su cuenta.</li>
              <li>Solo pueden registrarse personas mayores de 18 años o representantes legales de una empresa.</li>
            </ul>
          </Section>

          <Section title="4. Planes y Pagos">
            <ul className="list-disc pl-5 space-y-2">
              <li>El Servicio se ofrece en diferentes planes de suscripción con precios en pesos mexicanos (MXN) más IVA.</li>
              <li>Los cargos son recurrentes (mensual o anual) y se procesan a través del procesador de pagos autorizado.</li>
              <li>Los precios pueden modificarse con 30 días de anticipación mediante notificación a su correo registrado.</li>
              <li>No se realizan reembolsos por periodos parciales una vez iniciado el ciclo de facturación, salvo que la
                ley aplicable lo exija.</li>
              <li>La falta de pago resultará en la suspensión del acceso hasta regularizar el adeudo.</li>
            </ul>
          </Section>

          <Section title="5. Uso Aceptable">
            Usted se compromete a NO utilizar el Servicio para:
            <ul className="list-disc pl-5 space-y-2 mt-3">
              <li>Actividades ilegales o que infrinjan derechos de terceros.</li>
              <li>Introducir código malicioso, virus o cualquier software dañino.</li>
              <li>Intentar acceder sin autorización a sistemas o datos de otros usuarios.</li>
              <li>Revender, sublicenciar o transferir el acceso al Servicio a terceros sin autorización escrita.</li>
              <li>Recopilar datos de otros usuarios por medios automatizados.</li>
            </ul>
          </Section>

          <Section title="6. Propiedad Intelectual">
            Todos los derechos sobre el Servicio, incluyendo software, diseño, marca, logotipos y documentación, son
            propiedad exclusiva de Deployr o de sus licenciantes. Este acuerdo no le otorga ningún derecho de propiedad
            sobre el Servicio. Los datos que usted ingrese al Servicio son de su propiedad y Deployr no adquiere ningún
            derecho sobre ellos, salvo los necesarios para prestar el Servicio.
          </Section>

          <Section title="7. Privacidad y Datos">
            El tratamiento de sus datos personales se rige por nuestra{" "}
            <Link href="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>, que forma
            parte integral de estos Términos. Al usar el Servicio, usted consiente el tratamiento descrito en dicha
            política.
          </Section>

          <Section title="8. Disponibilidad y Soporte">
            Deployr realizará esfuerzos razonables para mantener el Servicio disponible, pero no garantiza una
            disponibilidad del 100%. Podemos suspender el acceso temporalmente por mantenimiento, mejoras de
            seguridad o causas de fuerza mayor. El soporte se presta según el nivel incluido en su plan contratado.
          </Section>

          <Section title="9. Limitación de Responsabilidad">
            En la máxima medida permitida por la ley aplicable, Deployr no será responsable por daños indirectos,
            incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso del Servicio. La
            responsabilidad total de Deployr frente a usted no excederá el importe pagado por el Servicio en los
            tres (3) meses anteriores al evento que generó la reclamación.
          </Section>

          <Section title="10. Terminación">
            Cualquiera de las partes puede cancelar la suscripción con al menos 30 días de anticipación al siguiente
            período de facturación. Deployr puede suspender o cancelar su acceso de forma inmediata si usted incumple
            estos Términos. Tras la cancelación, sus datos se conservarán por 30 días para que pueda exportarlos,
            transcurrido este plazo serán eliminados definitivamente.
          </Section>

          <Section title="11. Modificaciones">
            Nos reservamos el derecho de modificar estos Términos en cualquier momento. Las modificaciones serán
            notificadas con al menos 15 días de anticipación por correo electrónico. El uso continuado del Servicio
            después del período de notificación implica la aceptación de los nuevos Términos.
          </Section>

          <Section title="12. Ley Aplicable y Jurisdicción">
            Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia
            derivada de estos Términos, las partes se someten a la jurisdicción de los tribunales competentes de la
            Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.
          </Section>

          <Section title="13. Contacto">
            Para cualquier pregunta sobre estos Términos, contáctenos en:{" "}
            <a href="mailto:legal@deployr.mx" className="text-primary hover:underline">legal@deployr.mx</a>
          </Section>
        </div>
      </main>

      <footer className="border-t border-white/10 mt-16 py-8 text-center">
        <p className="font-mono text-xs text-on-surface-variant">
          © 2026 Deployr. Todos los derechos reservados. —{" "}
          <Link href="/privacy" className="hover:text-primary transition-colors">Política de Privacidad</Link>
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
