FROM public.ecr.aws/lambda/python:3.10-x86_64

# Copy requirements.txt
COPY requirements.txt .

# Install the specified packages
RUN pip install -r requirements.txt

# Copy function code
COPY . ${LAMBDA_TASK_ROOT}

# Ensure the entrypoint script has proper permissions
RUN chmod 755 ${LAMBDA_TASK_ROOT}/index.py

# Set the CMD to your handler (using the correct file name)
CMD [ "index.lambda_handler" ] 