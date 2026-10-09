namespace internal_search.Domain.Exceptions
{
    public class ReniecNoDisponibleException : Exception
    {
        public ReniecNoDisponibleException(string mensaje, Exception? inner = null)
            : base(mensaje, inner)
        {
        }
    }
}
