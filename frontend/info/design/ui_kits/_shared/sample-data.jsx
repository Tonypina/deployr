/* Sample data for every UI kit. */

const SAMPLE = {
  tickets: [
    { id: "tk1", title: "Compresor industrial — mantenimiento programado", description: "Servicio trimestral según contrato.", status: "IN_PROGRESS", priority: "HIGH", scheduledAt: "2026-05-22T14:30:00Z", createdAt: "2026-05-15T10:00:00Z", client: { id: "c1", name: "Servicios XYZ" }, branch: { id: "b1", name: "Sucursal Norte", city: "Monterrey" }, equipment: { id: "e1", name: "Compresor CAT-200" }, technician: { id: "t1", name: "Carlos Mendoza" } },
    { id: "tk2", title: "Aire acondicionado oficina 4 no enfría", status: "OPEN", priority: "URGENT", createdAt: "2026-05-23T08:15:00Z", client: { id: "c2", name: "Industrial Hidalgo" }, branch: { id: "b2", name: "Planta Toluca" }, technician: null },
    { id: "tk3", title: "Cambio de filtros HVAC — calendarizado", status: "OPEN", priority: "MEDIUM", scheduledAt: "2026-05-28T09:00:00Z", createdAt: "2026-05-20T11:00:00Z", client: { id: "c1", name: "Servicios XYZ" }, branch: { id: "b3", name: "Sucursal Sur" }, technician: { id: "t2", name: "Ana López" } },
    { id: "tk4", title: "Revisión bomba de agua", status: "COMPLETED", priority: "LOW", closedAt: "2026-05-19T16:00:00Z", createdAt: "2026-05-18T09:00:00Z", client: { id: "c3", name: "Constructora Linares" }, branch: { id: "b4", name: "Bodega Pachuca" }, technician: { id: "t1", name: "Carlos Mendoza" }, report: { id: "r1" } },
    { id: "tk5", title: "Reemplazo de banda en motor", status: "COMPLETED", priority: "MEDIUM", closedAt: "2026-05-17T14:00:00Z", createdAt: "2026-05-14T10:00:00Z", client: { id: "c1", name: "Servicios XYZ" }, branch: { id: "b1", name: "Sucursal Norte", city: "Monterrey" }, technician: { id: "t2", name: "Ana López" }, report: { id: "r2" } },
    { id: "tk6", title: "Inspección rutinaria — calderas", status: "CANCELLED", priority: "LOW", createdAt: "2026-05-10T08:00:00Z", client: { id: "c2", name: "Industrial Hidalgo" }, branch: { id: "b2", name: "Planta Toluca" } },
  ],
  clients: [
    { id: "c1", name: "Servicios XYZ", contactEmail: "contacto@xyz.com", _count: { branches: 3, tickets: 14 } },
    { id: "c2", name: "Industrial Hidalgo", contactEmail: "compras@indhidalgo.mx", _count: { branches: 2, tickets: 9 } },
    { id: "c3", name: "Constructora Linares", contactEmail: "operaciones@linares.mx", _count: { branches: 1, tickets: 3 } },
  ],
  technicians: [
    { id: "t1", name: "Carlos Mendoza", email: "carlos.m@empresa.com", phone: "+52 55 1234 5678", isActive: true },
    { id: "t2", name: "Ana López", email: "ana.l@empresa.com", phone: "+52 81 9876 5432", isActive: true },
    { id: "t3", name: "Roberto Vera", email: "roberto.v@empresa.com", isActive: false },
  ],
  inventory: [
    { id: "i1", name: "Filtro de aire HVAC", sku: "FA-001", quantity: 7, unit: "pzas", minStock: 10 },
    { id: "i2", name: "Aceite hidráulico 20L", sku: "AH-020", quantity: 24, unit: "L", minStock: 12 },
    { id: "i3", name: "Banda industrial B-77", sku: "BI-077", quantity: 3, unit: "pzas", minStock: 5 },
    { id: "i4", name: "Sello mecánico 1.5\"", sku: "SM-15", quantity: 48, unit: "pzas", minStock: 20 },
    { id: "i5", name: "Refrigerante R-410A", sku: "RF-410", quantity: 6, unit: "kg" },
  ],
  visits: [
    { id: "v1", requestedAt: "2026-05-30T10:00:00Z", status: "PENDING", client: { id: "c1", name: "Servicios XYZ" }, branch: { id: "b1", name: "Sucursal Norte", city: "Monterrey" }, notes: "Revisar compresor que hace ruido anormal." },
    { id: "v2", requestedAt: "2026-06-02T15:30:00Z", status: "CONFIRMED", client: { id: "c2", name: "Industrial Hidalgo" }, branch: { id: "b2", name: "Planta Toluca" }, notes: "Inspección preventiva trimestral." },
    { id: "v3", requestedAt: "2026-05-12T09:00:00Z", status: "COMPLETED", client: { id: "c1", name: "Servicios XYZ" }, branch: { id: "b1", name: "Sucursal Norte" } },
  ],
};

window.SAMPLE = SAMPLE;
