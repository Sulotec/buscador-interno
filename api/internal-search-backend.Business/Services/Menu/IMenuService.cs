using internal_search.Domain.DTOs.Menu;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Menu
{
    public interface IMenuService
    {
        Task<List<MenuDto>> ObtenerMenusPorRolAsync(int codRol);
        Task<List<MenuDto>> ObtenerMenusPorRolesAsync(IEnumerable<int> codRoles);
        Task<List<MenuDto>> ObtenerTodosLosMenusAsync();
    }
}
