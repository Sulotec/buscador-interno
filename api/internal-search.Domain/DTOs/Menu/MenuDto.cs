using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.DTOs.Menu
{
    public class MenuDto
    {
        public int CodMenu { get; set; }
        public int? CodMenuPadre { get; set; }
        public string NomMenu { get; set; } = "";
        public string? Ruta { get; set; }
        public string? Icono { get; set; }
        public int Orden { get; set; }
        public int PuedeVer { get; set; }
        public int PuedeCrear { get; set; }
        public int PuedeEditar { get; set; }
        public int PuedeEliminar { get; set; }
        public List<MenuDto> Children { get; set; } = new();
    }
}
