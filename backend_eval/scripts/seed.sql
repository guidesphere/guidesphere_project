-- L1 VIDEO
INSERT INTO question_bank(material_id,topic,difficulty,question,option_a,option_b,option_c,option_d,correct) VALUES
('11111111-1111-1111-1111-111111111111','Docker básico',1,'¿Qué es una imagen?','Un contenedor','Plantilla inmutable','Un volumen','Una red','B'),
('11111111-1111-1111-1111-111111111111','Puertos',1,'-p 8080:80 hace…','80->8080','8080->80','Cierra 8080','Nada','B'),
('11111111-1111-1111-1111-111111111111','Volúmenes',1,'¿Para qué?','Persistir datos','Acelerar CPU','Logs sistema','Memoria','A'),
('11111111-1111-1111-1111-111111111111','Dockerfile',1,'Instrucción de comando por defecto','RUN','CMD','COPY','ARG','B'),
('11111111-1111-1111-1111-111111111111','Compose',1,'Archivo típico','compose.json','docker.yaml','docker-compose.yml','compose.yml','C');

-- L2 DOC
INSERT INTO question_bank(material_id,topic,difficulty,question,option_a,option_b,option_c,option_d,correct) VALUES
('22222222-2222-2222-2222-222222222222','Redes',1,'¿Qué permite la red?','Conectar contenedores','Borrar imágenes','Editar kernel','Nada','A'),
('22222222-2222-2222-2222-222222222222','Health',1,'¿pg_isready se usa en…','Healthcheck','Build','Logs','Cache','A'),
('22222222-2222-2222-2222-222222222222','Stats',1,'docker stats muestra…','Redes','Recursos','Imágenes','Nada','B'),
('22222222-2222-2222-2222-222222222222','Prune',1,'system prune -a…','Limpia no usados','Elimina DB','Cambia puertos','Nada','A'),
('22222222-2222-2222-2222-222222222222','Entrypoint',1,'ENTRYPOINT se usa para…','Variables','Comando base','Copiar archivos','Red','B');
