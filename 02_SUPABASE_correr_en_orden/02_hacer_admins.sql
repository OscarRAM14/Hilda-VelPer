-- =====================================================================
--  Hilda VelPer · ARCHIVO 2 de 2 · versión 1.1.0
--  Córrelo DESPUÉS de que tú y tu mamá creen su cuenta en la app.
--  1) Cambia los dos correos por los reales (entre comillas simples)
--  2) SQL Editor > New query > pega > Run
-- =====================================================================
update perfiles set rol = 'admin', activo = true
where email in ('CORREO-DE-NACHO@gmail.com', 'CORREO-DE-MAMA@gmail.com');

-- Para revisar quién está registrado:
select nombre, email, rol, activo from perfiles order by creado;
