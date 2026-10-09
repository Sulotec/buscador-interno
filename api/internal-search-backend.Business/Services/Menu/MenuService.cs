using internal_search.Domain.DTOs.Menu;
using internal_search.Domain.Interfaces.Menu;
using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search_backend.Business.Services.Menu
{
    public class MenuService : IMenuService
    {
        private readonly IMenuRepository _menuRepository;

        public MenuService(IMenuRepository menuRepository)
        {
            _menuRepository = menuRepository;
        }

        public async Task<List<MenuDto>> ObtenerMenusPorRolAsync(int codRol)
        {
            return await _menuRepository.ObtenerMenusPorRolAsync(codRol);
        }

        public Task<List<MenuDto>> ObtenerTodosLosMenusAsync() =>
            _menuRepository.ObtenerTodosLosMenusAsync();

        public async Task<List<MenuDto>> ObtenerMenusPorRolesAsync(IEnumerable<int> codRoles)
        {
            return await _menuRepository.ObtenerMenusPorRolesAsync(codRoles);
        }
    }
}
