-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-09-2026 a las 20:19:47
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `telemedicina2026`
--
CREATE DATABASE IF NOT EXISTS telemedicina2026 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE telemedicina2026;
-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`) VALUES
(1, 'Termómetros'),
(2, 'Estetoscopios'),
(3, 'Sillas de ruedas'),
(4, 'Monitores de signos vitales');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `gestores`
--

CREATE TABLE `gestores` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellidos` varchar(50) NOT NULL,
  `usuario` varchar(25) NOT NULL,
  `password` varchar(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `gestores`
--

INSERT INTO `gestores` (`id`, `nombre`, `apellidos`, `usuario`, `password`) VALUES
(1, 'José', 'López Ruiz', 'pepe', '123'),
(2, 'Ana', 'García López', 'ana.garcia', 'gestor456');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modelos`
--

CREATE TABLE `modelos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `categoria` int(11) NOT NULL,
  `horas_maximas` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `modelos`
--

INSERT INTO `modelos` (`id`, `nombre`, `categoria`, `horas_maximas`) VALUES
(1, 'ASY-234', 1, 24),
(2, 'Termo-X 2000', 1, 48),
(3, 'Estetoscopio cardiología', 2, 72),
(4, 'Silla Rápida', 3, 120),
(5, 'Monitor multiparamétrico', 4, 24);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `recursos`
--

CREATE TABLE `recursos` (
  `id` int(11) NOT NULL,
  `modelo` int(11) NOT NULL,
  `ubicacion` int(11) NOT NULL,
  `numero_serie` varchar(25) NOT NULL,
  `estado` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `recursos`
--

INSERT INTO `recursos` (`id`, `modelo`, `ubicacion`, `numero_serie`, `estado`) VALUES
(1, 1, 1, 'AD58754', 0),
(2, 1, 2, 'AD58755', 0),
(3, 1, 2, 'AD58756', 0),
(4, 2, 3, 'TERM-001', 0),
(5, 3, 4, 'ESTET-001', 1),
(6, 4, 5, 'SILLA-001', 0);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `resenyas`
--

CREATE TABLE `resenyas` (
  `id` int(11) NOT NULL,
  `recurso` int(11) NOT NULL,
  `sanitario` int(11) NOT NULL,
  `fecha` datetime NOT NULL,
  `valor` int(11) NOT NULL,
  `descripcion` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `resenyas`
--

INSERT INTO `resenyas` (`id`, `recurso`, `sanitario`, `fecha`, `valor`, `descripcion`) VALUES
(1, 1, 1, '2025-04-11 13:52:00', 5, 'Todo perfecto');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reservas`
--

CREATE TABLE `reservas` (
  `id` int(11) NOT NULL,
  `recurso` int(11) NOT NULL,
  `sanitario` int(11) NOT NULL,
  `horas_estimadas` int(11) NOT NULL,
  `fecha_peticion` datetime NOT NULL,
  `fecha_inicio` datetime DEFAULT NULL,
  `fecha_fin` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `reservas`
--

INSERT INTO `reservas` (`id`, `recurso`, `sanitario`, `horas_estimadas`, `fecha_peticion`, `fecha_inicio`, `fecha_fin`) VALUES
(1, 1, 1, 2, '2025-04-12 14:30:50', '2025-04-12 14:40:00', '2025-04-12 16:00:00'),
(2, 1, 2, 2, '2025-04-13 10:00:00', '2025-04-13 10:30:00', NULL),
(3, 1, 3, 2, '2025-04-13 10:00:00', NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sanitarios`
--

CREATE TABLE `sanitarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `apellidos` varchar(50) NOT NULL,
  `usuario` varchar(25) NOT NULL,
  `password` varchar(25) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `sanitarios`
--

INSERT INTO `sanitarios` (`id`, `nombre`, `apellidos`, `usuario`, `password`) VALUES
(1, 'María Estrella', 'López', 'maria.lopez', 'pass123'),
(2, 'Luis', 'Navarro García', 'luis.navarro', 'pass456'),
(3, 'Amparo', 'Maciá Ruiz', 'amparo.macia', 'pass789');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ubicaciones`
--

CREATE TABLE `ubicaciones` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `ubicaciones`
--

INSERT INTO `ubicaciones` (`id`, `nombre`) VALUES
(1, 'Almacén 1'),
(2, 'Almacén 2'),
(3, 'Sala de Espera'),
(4, 'Quirófano 1'),
(5, 'Laboratorio Central'),
(6, 'Urgencias - Almacén');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `gestores`
--
ALTER TABLE `gestores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`);

--
-- Indices de la tabla `modelos`
--
ALTER TABLE `modelos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `categoria` (`categoria`);

--
-- Indices de la tabla `recursos`
--
ALTER TABLE `recursos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `modelo` (`modelo`),
  ADD KEY `ubicacion` (`ubicacion`);

--
-- Indices de la tabla `resenyas`
--
ALTER TABLE `resenyas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recurso` (`recurso`),
  ADD KEY `sanitario` (`sanitario`);

--
-- Indices de la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `recurso` (`recurso`),
  ADD KEY `sanitario` (`sanitario`);

--
-- Indices de la tabla `sanitarios`
--
ALTER TABLE `sanitarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`);

--
-- Indices de la tabla `ubicaciones`
--
ALTER TABLE `ubicaciones`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `gestores`
--
ALTER TABLE `gestores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `modelos`
--
ALTER TABLE `modelos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `recursos`
--
ALTER TABLE `recursos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `resenyas`
--
ALTER TABLE `resenyas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `reservas`
--
ALTER TABLE `reservas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `sanitarios`
--
ALTER TABLE `sanitarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `ubicaciones`
--
ALTER TABLE `ubicaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `modelos`
--
ALTER TABLE `modelos`
  ADD CONSTRAINT `modelo_categoria` FOREIGN KEY (`categoria`) REFERENCES `categorias` (`id`);

--
-- Filtros para la tabla `recursos`
--
ALTER TABLE `recursos`
  ADD CONSTRAINT `recurso_modelo` FOREIGN KEY (`modelo`) REFERENCES `modelos` (`id`),
  ADD CONSTRAINT `recurso_ubicacion` FOREIGN KEY (`ubicacion`) REFERENCES `ubicaciones` (`id`);

--
-- Filtros para la tabla `resenyas`
--
ALTER TABLE `resenyas`
  ADD CONSTRAINT `resenyas_recurso` FOREIGN KEY (`recurso`) REFERENCES `recursos` (`id`),
  ADD CONSTRAINT `resenyas_sanitario` FOREIGN KEY (`sanitario`) REFERENCES `sanitarios` (`id`);

--
-- Filtros para la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD CONSTRAINT `reserva_sanitario` FOREIGN KEY (`sanitario`) REFERENCES `sanitarios` (`id`),
  ADD CONSTRAINT `reservas_recurso` FOREIGN KEY (`recurso`) REFERENCES `recursos` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
