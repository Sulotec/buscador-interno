using internal_search.Domain.DTOs.Menu;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.Interfaces.Menu
{
    public interface IMenuRepository
    {
        Task<List<MenuDto>> ObtenerMenusPorRolAsync(int codRol);

        // Une los menús de varios roles; ante un menú repetido gana el permiso más amplio
        Task<List<MenuDto>> ObtenerMenusPorRolesAsync(IEnumerable<int> codRoles);

        // Todos los menús activos con todos los permisos (roles de RolesSistema.ConAccesoTotal)
        Task<List<MenuDto>> ObtenerTodosLosMenusAsync();
    }
}
