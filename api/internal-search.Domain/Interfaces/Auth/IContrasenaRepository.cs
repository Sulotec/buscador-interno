using System;
using System.Collections.Generic;
using System.Text;

namespace internal_search.Domain.Interfaces.Auth
{
    public interface IContrasenaRepository
    {
        bool Verificar(string password, string hash);
        string Hashear(string password);
    }
}
