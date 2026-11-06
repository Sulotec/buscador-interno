using internal_search.Domain.Entities;

namespace internal_search.Domain.Exceptions
{
    // El documento está en la lista negra: no se consulta ni se cobra. La API responde 423 con los datos del bloqueo.
    public class DocumentoBloqueadoException : Exception
    {
        public ListaNegra Bloqueo { get; }

        public DocumentoBloqueadoException(ListaNegra bloqueo)
            : base("Este DNI está en la lista negra y no se puede consultar.")
        {
            Bloqueo = bloqueo;
        }
    }
}
